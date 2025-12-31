import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ShoppingCartRequest, ShoppingCartResponse, SharedCartResponse, ShareCartResponse } from '../models/ShoppingCart';
import { randomUUID } from 'node:crypto';
import { handleRouteError, validateArray } from '../utils/errorHandler';

// Authenticated routes
const router = Router();
router.use(authenticate);

// GET /api/cart - Get current user's cart
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const cart = await prisma.shoppingCart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Shopping cart not found' });
    }

    const response: ShoppingCartResponse = {
      id: cart.id,
      userId: cart.userId,
      recipeIds: cart.recipeIds,
      shoppingList: cart.shoppingList as any,
      checkedItems: cart.checkedItems,
      shareToken: cart.shareToken,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };

    res.json(response);
  } catch (error) {
    handleRouteError(error, res, 'fetching shopping cart');
  }
});

// PUT /api/cart - Create/update current user's cart
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { recipeIds, shoppingList, checkedItems }: ShoppingCartRequest = req.body;

    if (!Array.isArray(recipeIds) || !shoppingList) {
      return res.status(400).json({ error: 'recipeIds and shoppingList are required' });
    }

    const cart = await prisma.shoppingCart.upsert({
      where: { userId },
      update: {
        recipeIds,
        shoppingList: shoppingList as any,
        checkedItems: checkedItems || [],
        updatedAt: new Date(),
      },
      create: {
        userId,
        recipeIds,
        shoppingList: shoppingList as any,
        checkedItems: checkedItems || [],
      },
    });

    const response: ShoppingCartResponse = {
      id: cart.id,
      userId: cart.userId,
      recipeIds: cart.recipeIds,
      shoppingList: cart.shoppingList as any,
      checkedItems: cart.checkedItems,
      shareToken: cart.shareToken,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };

    res.json(response);
  } catch (error) {
    handleRouteError(error, res, 'saving shopping cart');
  }
});

// DELETE /api/cart - Delete current user's cart
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    await prisma.shoppingCart.delete({
      where: { userId },
    });

    res.status(204).send();
  } catch (error) {
    handleRouteError(error, res, 'deleting shopping cart');
  }
});

// POST /api/cart/share - Generate/regenerate share token
router.post('/share', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const cart = await prisma.shoppingCart.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Shopping cart not found' });
    }

    const shareToken = randomUUID();

    const updated = await prisma.shoppingCart.update({
      where: { userId },
      data: { shareToken },
    });

    const shareUrl = `${req.protocol}://${req.get('host')}/cart/shared/${shareToken}`;

    const response: ShareCartResponse = {
      shareToken: updated.shareToken!,
      shareUrl,
    };

    res.json(response);
  } catch (error) {
    handleRouteError(error, res, 'sharing shopping cart');
  }
});

// DELETE /api/cart/share - Remove share token (stop sharing)
router.delete('/share', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    await prisma.shoppingCart.update({
      where: { userId },
      data: { shareToken: null },
    });

    res.status(204).send();
  } catch (error) {
    handleRouteError(error, res, 'unsharing shopping cart');
  }
});

// Public routes for shared carts (no authentication required)
const publicRouter = Router();
// Note: publicRouter does NOT use authenticate middleware

// Rate limiter for shared cart endpoints
const sharedCartLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/cart/shared/:shareToken - Get shared cart by token
publicRouter.get('/shared/:shareToken', async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    const cart = await prisma.shoppingCart.findUnique({
      where: { shareToken },
      include: { user: { select: { name: true } } },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Shared cart not found' });
    }

    const response: SharedCartResponse = {
      shoppingList: cart.shoppingList as any,
      checkedItems: cart.checkedItems,
      ownerName: cart.user.name,
      shareToken: cart.shareToken!,
    };

    res.json(response);
  } catch (error) {
    handleRouteError(error, res, 'fetching shared cart');
  }
});

// PUT /api/cart/shared/:shareToken - Update shared cart checked items
publicRouter.put('/shared/:shareToken', sharedCartLimiter, async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;
    const { checkedItems } = req.body;

    // Validate checkedItems
    const checkedItemsValidation = validateArray(
      checkedItems,
      'checkedItems',
      1000,
      (item) => {
        if (typeof item !== 'string') {
          return { valid: false, error: 'All checkedItems must be strings' };
        }
        if (!/^\d+-\d+$/.test(item)) {
          return { valid: false, error: 'Each checkedItem must match format "sectionIndex-ingredientIndex"' };
        }
        return { valid: true };
      }
    );
    if (!checkedItemsValidation.valid) {
      return res.status(400).json({ error: checkedItemsValidation.error });
    }

    const cart = await prisma.shoppingCart.findUnique({
      where: { shareToken },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Shared cart not found' });
    }

    await prisma.shoppingCart.update({
      where: { shareToken },
      data: {
        checkedItems,
        updatedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error) {
    handleRouteError(error, res, 'updating shared cart');
  }
});

export { router as cartRouter, publicRouter as cartPublicRouter };
