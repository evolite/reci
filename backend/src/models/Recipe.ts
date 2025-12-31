export interface Recipe {
  id: string;
  videoUrl: string;
  videoPlatform?: string | null;
  thumbnailUrl: string;
  description: string;
  dishName: string;
  cuisineType: string;
  ingredients: string[];
  tags: string[];
  instructions?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecipeInput {
  videoUrl: string;
}

export interface VideoMetadata {
  title: string;
  thumbnailUrl: string;
  description: string;
  topComments?: string[];
  platform?: string;
}

export interface RecipeAnalysis {
  dishName: string;
  cuisineType: string;
  mainIngredients: string[]; // Keep for backward compatibility, will be used to populate ingredients
  ingredients?: string[]; // Full ingredients list with amounts
  instructions?: string; // Recipe instructions/steps
  suggestedTags?: string[];
  recipeText?: string; // Deprecated - use ingredients and instructions instead
  enhancedTitle?: string;
  enhancedDescription?: string;
}

export interface ShoppingListRequest {
  recipeIds: string[];
}

export interface ShoppingListSection {
  name: string;
  ingredients: string[];
}

export interface ShoppingListResponse {
  sections: ShoppingListSection[];
  missingRecipes: Array<{
    id: string;
    dishName: string;
  }>;
  totalRecipes: number;
  recipesWithIngredients: number;
}
