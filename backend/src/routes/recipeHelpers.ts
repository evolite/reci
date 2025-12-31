import { analyzeRecipeFromText } from '../services/openaiService';

// Helper function to clean instructions text
export function cleanInstructions(instructions: string): string {
  // Limit input length to prevent DoS attacks
  const MAX_INPUT_LENGTH = 100000;
  if (instructions.length > MAX_INPUT_LENGTH) {
    instructions = instructions.substring(0, MAX_INPUT_LENGTH);
  }
  
  let cleaned = instructions;
  
  // Remove "Ingredients:" headings and everything until "Instructions:" or "Steps:" or "Method:" or "Directions:"
  // Use negated character classes instead of . to prevent catastrophic backtracking
  // Limit to first 5000 characters to prevent DoS
  const maxSearchLength = Math.min(cleaned.length, 5000);
  const searchSection = cleaned.substring(0, maxSearchLength);
  const restSection = cleaned.substring(maxSearchLength);
  
  // Use negated character class [^\n] instead of . to avoid backtracking issues
  const ingredientsPattern = /^Ingredients?:?\s*\n[^\n]{0,5000}(?=\n(?:Instructions?|Steps?|Method|Directions?|$))/ims;
  let cleanedSection = searchSection.replace(ingredientsPattern, '');
  const ingredientsPattern2 = /^[^\n]{0,5000}Ingredients?:?\s*\n[^\n]{0,5000}(?=\n(?:Instructions?|Steps?|Method|Directions?|$))/ims;
  cleanedSection = cleanedSection.replace(ingredientsPattern2, '');
  cleaned = cleanedSection + restSection;
  
  // Helper function to check if a line contains measurement units
  const hasMeasurementUnit = (text: string): boolean => {
    const units = ['oz', 'cup', 'cups', 'tbsp', 'tsp', 'lb', 'pound', 'ounce', 'fl oz', 'g', 'kg', 'ml', 'dl', 'l'];
    const lowerText = text.toLowerCase();
    return units.some(unit => lowerText.includes(unit));
  };
  
  // Remove bullet points or numbered lists that look like ingredients (contain measurements)
  // Use more specific patterns with bounded quantifiers to prevent backtracking
  // Split into lines and process individually to avoid regex DoS
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    // Limit line length before regex matching
    if (line.length > 500) return true; // Keep long lines (likely not ingredient lines)
    
    // Check if line has measurement units first
    if (!hasMeasurementUnit(line)) return true;
    
    // More specific pattern: bullet + whitespace + digits/slashes (bounded)
    // Simplified regex by extracting unit matching
    const bulletMatch = /^\s*[•\-*]\s+\d{0,20}(?:\/\d{0,20})?\s{0,20}/i.test(line);
    if (bulletMatch) return false;
    
    // More specific pattern: start + digits (bounded) + dot + whitespace + digits/slashes (bounded)
    // Simplified regex by extracting unit matching
    const numberedMatch = /^\s*\d{0,10}\.?\s+\d{0,20}(?:\/\d{0,20})?\s{0,20}/i.test(line);
    if (numberedMatch) return false;
    
    return true;
  });
  cleaned = filteredLines.join('\n');
  
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
