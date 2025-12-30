export interface Recipe {
  id: string;
  youtubeUrl: string;
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
  youtubeUrl: string;
}

export interface YouTubeVideoMetadata {
  title: string;
  thumbnailUrl: string;
  description: string;
  topComments?: string[];
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
