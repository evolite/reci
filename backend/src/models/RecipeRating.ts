export interface RecipeRating {
  id: string;
  userId: string;
  recipeId: string;
  rating: number; // 1-6
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRatingInput {
  recipeId: string;
  rating: number; // 1-6
}

export interface UpdateRatingInput {
  rating: number; // 1-6
}

export interface RatingResponse {
  id: string;
  userId: string;
  recipeId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingStats {
  averageRating: number | null; // 1-6, rounded to 1 decimal, or null if no ratings
  count: number; // Total number of ratings
}
