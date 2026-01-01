import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  createOrUpdateRating,
  getUserRating,
  getRecipeRatingStats,
  validateRating,
} from '../services/ratingService';
import { handleRouteError } from '../utils/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/ratings - Create new rating
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { recipeId, rating } = req.body;

    if (!recipeId) {
      return res.status(400).json({ error: 'recipeId is required' });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({ error: 'rating is required' });
    }

    const validation = validateRating(rating);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    await createOrUpdateRating(req.userId!, recipeId, rating);

    res.status(201).json({ message: 'Rating created successfully' });
  } catch (error) {
    handleRouteError(error, res, 'creating rating');
  }
});

// PUT /api/ratings/:recipeId - Update existing rating
router.put('/:recipeId', async (req: AuthRequest, res: Response) => {
  try {
    const { recipeId } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ error: 'rating is required' });
    }

    const validation = validateRating(rating);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    await createOrUpdateRating(req.userId!, recipeId, rating);

    res.json({ message: 'Rating updated successfully' });
  } catch (error) {
    handleRouteError(error, res, 'updating rating');
  }
});

// GET /api/ratings/:recipeId - Get current user's rating for a recipe
router.get('/:recipeId', async (req: AuthRequest, res: Response) => {
  try {
    const { recipeId } = req.params;

    const rating = await getUserRating(req.userId!, recipeId);

    res.json({ rating });
  } catch (error) {
    handleRouteError(error, res, 'fetching user rating');
  }
});

// GET /api/ratings/recipe/:recipeId/stats - Get average rating and count for a recipe
router.get('/recipe/:recipeId/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { recipeId } = req.params;

    const stats = await getRecipeRatingStats(recipeId);

    res.json(stats);
  } catch (error) {
    handleRouteError(error, res, 'fetching rating stats');
  }
});

export default router;
