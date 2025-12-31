import { analyzeRecipeFromText } from '../services/openaiService';

// Helper function to clean instructions text
export function cleanInstructions(instructions: string): string {
  let cleaned = instructions;
  
  // Remove "Ingredients:" headings and everything until "Instructions:" or "Steps:" or "Method:" or "Directions:"
  const ingredientsPattern = /^Ingredients?:?\s*\n.*?(?=\n(?:Instructions?|Steps?|Method|Directions?|$))/ims;
  cleaned = cleaned.replace(ingredientsPattern, '');
  cleaned = cleaned.replace(/^.*?Ingredients?:?\s*\n.*?(?=\n(?:Instructions?|Steps?|Method|Directions?|$))/ims, '');
  
  // Remove bullet points or numbered lists that look like ingredients (contain measurements)
  // Simplified regex: removed unnecessary escapes and character class duplicates
  const measurementUnits = String.raw`(?:oz|cup|cups|tbsp|tsp|lb|pound|ounce|fl\s*oz|g|kg|ml|dl|l)`;
  const bulletPattern = new RegExp(String.raw`^[\s]*[•\-*]\s*[\d/\s]+${measurementUnits}[\s\w\s,()]+$`, 'gim');
  cleaned = cleaned.replaceAll(bulletPattern, '');
  
  // Remove lines that start with numbers/letters followed by measurements
  const numberedPattern = new RegExp(String.raw`^[\s]*[\d\w]+\.?\s+[\d/\s]+${measurementUnits}[\s\w\s,()]+$`, 'gim');
  cleaned = cleaned.replaceAll(numberedPattern, '');
  
  // Remove any remaining "Ingredients:" text
  cleaned = cleaned.replaceAll(/Ingredients?:?\s*/gi, '');
  return cleaned.trim();
}

// Helper function to analyze recipe text and update fields
export async function analyzeAndUpdateRecipe(
  instructions: string,
  existing: { description: string; tags: string[] }
): Promise<Partial<{ description: string; dishName: string; cuisineType: string; ingredients: string[]; instructions: string; tags: string[] }>> {
  try {
    const analysis = await analyzeRecipeFromText(instructions);
    const updateData: any = {};
    
    // Auto-update fields from analysis
    updateData.description = analysis.enhancedDescription || existing.description;
    updateData.dishName = analysis.dishName;
    updateData.cuisineType = analysis.cuisineType;
    
    // Use the extracted ingredients from analysis
    if (analysis.ingredients && analysis.ingredients.length > 0) {
      updateData.ingredients = analysis.ingredients;
    }
    
    // Use the extracted instructions from analysis (already cleaned by OpenAI)
    if (analysis.instructions) {
      updateData.instructions = cleanInstructions(analysis.instructions);
    }
    
    // Merge suggested tags with existing tags
    const existingTags = existing.tags || [];
    const suggestedTags = analysis.suggestedTags || [];
    updateData.tags = [...new Set([...existingTags, ...suggestedTags])];
    
    return updateData;
  } catch (error) {
    console.error('Error analyzing recipe:', error);
    // Return just the cleaned instructions if analysis fails
    return {
      instructions: cleanInstructions(instructions),
    };
  }
}

// Helper function to validate and prepare update data
export function prepareUpdateData(
  body: {
    description?: string;
    dishName?: string;
    cuisineType?: string;
    ingredients?: any;
    instructions?: string | null;
    tags?: any;
  }
): { updateData: any; hasInstructions: boolean; instructionsValue: string | null } {
  const updateData: any = {};
  let hasInstructions = false;
  let instructionsValue: string | null = null;
  
  if (body.description !== undefined) updateData.description = String(body.description);
  if (body.dishName !== undefined) updateData.dishName = String(body.dishName);
  if (body.cuisineType !== undefined) updateData.cuisineType = String(body.cuisineType);
  
  if (body.ingredients !== undefined) {
    if (!Array.isArray(body.ingredients)) {
      throw new TypeError('ingredients must be an array');
    }
    updateData.ingredients = body.ingredients.filter((ing: any) => typeof ing === 'string' && ing.trim().length > 0);
  }
  
  if (body.instructions !== undefined) {
    hasInstructions = true;
    instructionsValue = body.instructions === null || body.instructions === '' ? null : String(body.instructions);
  }
  
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      throw new TypeError('tags must be an array');
    }
    updateData.tags = body.tags.filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0);
  }
  
  return { updateData, hasInstructions, instructionsValue };
}
