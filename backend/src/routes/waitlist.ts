import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/waitlist - Join the waitlist
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if email is already on waitlist
    const existing = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.json({
        email: existing.email,
        position: existing.position,
        message: 'You are already on the waitlist',
      });
    }

    // Get current waitlist count to determine position
    const count = await prisma.waitlist.count();
    const position = count + 1;

    // Add to waitlist
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email: email.toLowerCase().trim(),
        position,
      },
    });

    res.status(201).json({
      email: waitlistEntry.email,
      position: waitlistEntry.position,
      message: 'Successfully joined the waitlist',
    });
  } catch (error) {
    console.error('Join waitlist error:', error);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// GET /api/waitlist/position/:email - Get waitlist position (public)
router.get('/position/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const entry = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Email not found on waitlist' });
    }

    res.json({
      email: entry.email,
      position: entry.position,
      total: await prisma.waitlist.count(),
    });
  } catch (error) {
    console.error('Get waitlist position error:', error);
    res.status(500).json({ error: 'Failed to get waitlist position' });
  }
});

// GET /api/waitlist/stats - Get waitlist statistics (public)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const total = await prisma.waitlist.count();
    res.json({ total });
  } catch (error) {
    console.error('Get waitlist stats error:', error);
    res.status(500).json({ error: 'Failed to get waitlist statistics' });
  }
});

export default router;
