import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateInviteToken } from '../services/authService';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAdmin);

// POST /api/invites - Generate new invite (admin only, optional email restriction)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { email, expiresInDays } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = generateInviteToken();
    let expiresAt: Date | null = null;

    if (expiresInDays && typeof expiresInDays === 'number' && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const invite = await prisma.invite.create({
      data: {
        token,
        email: email || null,
        createdById: req.userId,
        expiresAt,
      },
      include: {
        createdBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      invite: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        createdBy: invite.createdBy,
      },
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// GET /api/invites - List all invites (admin only, show usage status)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const invites = await prisma.invite.findMany({
      include: {
        createdBy: {
          select: {
            email: true,
            name: true,
          },
        },
        usedBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      invites: invites.map(invite => ({
        id: invite.id,
        token: invite.token,
        email: invite.email,
        used: !!invite.usedById,
        usedAt: invite.usedAt,
        expiresAt: invite.expiresAt,
        expired: invite.expiresAt ? invite.expiresAt < new Date() : false,
        createdAt: invite.createdAt,
        createdBy: invite.createdBy,
        usedBy: invite.usedBy,
      })),
    });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// DELETE /api/invites/:id - Revoke invite (admin only)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invite = await prisma.invite.findUnique({
      where: { id },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.usedById) {
      return res.status(400).json({ error: 'Cannot revoke an invite that has already been used' });
    }

    await prisma.invite.delete({
      where: { id },
    });

    res.json({ message: 'Invite revoked successfully' });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
});

// GET /api/invites/stats - Get invite statistics (admin only)
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [total, used, unused, expired] = await Promise.all([
      prisma.invite.count(),
      prisma.invite.count({
        where: {
          usedById: {
            not: null,
          },
        },
      }),
      prisma.invite.count({
        where: {
          usedById: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      prisma.invite.count({
        where: {
          expiresAt: {
            lt: new Date(),
          },
          usedById: null,
        },
      }),
    ]);

    res.json({
      stats: {
        total,
        used,
        unused,
        expired,
      },
    });
  } catch (error) {
    console.error('Get invite stats error:', error);
    res.status(500).json({ error: 'Failed to fetch invite statistics' });
  }
});

export default router;
