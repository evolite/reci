import { prisma } from '../lib/prisma';
import type { RatingStats } from '../models/RecipeRating';

/**
 * Calculate the average rating for a recipe
 */
export async function calculateAverageRating(recipeId: string): Promise<number | null> {
  const result = await prisma.recipeRating.aggregate({
    where: { recipeId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  if (result._count.rating === 0) {
    return null;
  }

  // Round to 1 decimal place
  return result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : null;
}

/**
 * Get a user's rating for a specific recipe
 */
export async function getUserRating(userId: string, recipeId: string): Promise<number | null> {
  const rating = await prisma.recipeRating.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
    select: { rating: true },
  });

  return rating?.rating ?? null;
}

/**
 * Get rating statistics for a recipe
 */
export async function getRecipeRatingStats(recipeId: string): Promise<RatingStats> {
  const [average, count] = await Promise.all([
    calculateAverageRating(recipeId),
    prisma.recipeRating.count({
      where: { recipeId },
    }),
  ]);

  return {
    averageRating: average,
    count,
  };
}

/**
 * Create or update a user's rating for a recipe
 */
export async function createOrUpdateRating(
  userId: string,
  recipeId: string,
  rating: number
): Promise<void> {
  // Validate rating range
  if (rating < 1 || rating > 6 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 1 and 6');
  }

  // Check if recipe exists
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
  });

  if (!recipe) {
    throw new Error('Recipe not found');
  }

  // Upsert the rating
  await prisma.recipeRating.upsert({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
    update: {
      rating,
      updatedAt: new Date(),
    },
    create: {
      userId,
      recipeId,
      rating,
    },
  });
}

/**
 * Validate rating value
 */
export function validateRating(rating: unknown): { valid: boolean; error?: string } {
  if (typeof rating !== 'number') {
    return { valid: false, error: 'Rating must be a number' };
  }

  if (!Number.isInteger(rating)) {
    return { valid: false, error: 'Rating must be an integer' };
  }

  if (rating < 1 || rating > 6) {
    return { valid: false, error: 'Rating must be between 1 and 6' };
  }

  return { valid: true };
}
