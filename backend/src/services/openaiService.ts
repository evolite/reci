import OpenAI from 'openai';
import { RecipeAnalysis, ShoppingListResponse } from '../models/Recipe';
import { sanitizeInput } from '../utils/validation';
import { prisma } from '../lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for model setting to avoid database queries on every request
let modelCache: string | null = null;
let modelCacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

async function getOpenAIModel(): Promise<string> {
  const now = Date.now();
  
  // Return cached value if still valid
  if (modelCache && (now - modelCacheTime) < CACHE_TTL) {
    return modelCache;
  }
  
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'openai_model' },
    });
    
    if (setting) {
      modelCache = setting.value;
      modelCacheTime = now;
      return setting.value;
    }
  } catch (error) {
    console.error('Error fetching OpenAI model from settings:', error);
  }
  
  // Fallback to default
  const defaultModel = 'gpt-5-mini';
  modelCache = defaultModel;
  modelCacheTime = now;
  return defaultModel;
}

// Function to clear cache (call this when settings are updated)
export function clearModelCache() {
  modelCache = null;
  modelCacheTime = 0;
}

function buildCommentsText(comments: string[]): string {
  if (comments.length === 0) {
    return '';
  }
  const commentsList = comments.map((c, i) => `${i + 1}. ${c}`).join('\n\n');
  return `\n\nTop Comments from viewers (these often contain full recipes):\n${commentsList}`;
}

function buildRecipePrompt(title: string, description: string, commentsText: string): string {
  return `Analyze the following recipe content (from a video, blog post, or recipe website) and extract ALL relevant information. Return ONLY a valid JSON object with no additional text. 

IMPORTANT: Even if the title or description is minimal or unclear, you MUST still return a valid JSON object with your best guess for the dish name, cuisine type, and ingredients based on what information is available. Do NOT return an error object - always return the required JSON structure.

Title: ${title}
Description: ${description}${commentsText}

IMPORTANT: The description or comments section often contains the FULL RECIPE with ingredients and step-by-step instructions. Pay special attention to text that lists ingredients, measurements, cooking times, temperatures, and step-by-step instructions. Extract the complete recipe text if found.

If the title or description is unclear, use your knowledge to infer what dish this might be based on the available information. For example, if the title is just "Pigs in a Blanket", infer that this is likely an American appetizer dish.

Extract and return a JSON object with the following structure:
{
  "dishName": "The name of the dish (e.g., 'Chicken Tikka Masala', 'Chocolate Chip Cookies')",
  "cuisineType": "The cuisine type (e.g., 'Indian', 'Italian', 'American', 'Japanese', 'Mexican', etc.)",
  "mainIngredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4", "ingredient5"],
  "ingredients": ["2 dl milk", "500 g flour", "3 eggs", "1 tsp salt", "etc."],
  "instructions": "ONLY the step-by-step cooking instructions. Do NOT include any ingredient lists, 'Ingredients:' headings, or ingredient measurements. Extract ONLY the actual cooking steps, methods, and techniques. Format clearly with numbered steps or paragraphs. Include cooking times, temperatures (in °C), and all important details.",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "enhancedTitle": "A clear, descriptive title for this dish/recipe (more informative than the video title if possible, or use the video title if it's already good). Do not include 'video' in the title.",
  "enhancedDescription": "A comprehensive description of the DISH itself - what it is, what makes it special, its flavors, textures, cooking method, difficulty level, time required, serving size, etc. Describe the dish, NOT the video. Do not mention 'video', 'watch', or anything about viewing it."
}

The mainIngredients array should contain 3-5 key ingredient names (without amounts) that are essential to the dish.
The ingredients array should contain ALL ingredients with their amounts/measurements in European/metric units (e.g., "2 dl milk", "500 g flour", "3 eggs", "1 tsp salt"). IMPORTANT: Convert all measurements to European/metric units (ml/dl/L for liquids, g/kg for weights). Conversion: 1 cup = 2.4 dl = 240 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml, 1 oz = 28 g, 1 lb = 450 g.
CRITICAL: The instructions field must contain ONLY the step-by-step cooking instructions. Do NOT include:
- Any ingredient lists (even if they appear in the recipe text)
- Any "Ingredients:" headings or sections
- Any ingredient measurements or amounts
- Only include the actual cooking steps, methods, and techniques

Format clearly with numbered steps or paragraphs. Include cooking times, temperatures (in °C), and all important details. IMPORTANT: Convert temperatures to Celsius (°F to °C: (°F - 32) × 5/9). 

If the recipe text contains both ingredients and instructions, you MUST:
1. Extract all ingredients (with amounts) into the ingredients array
2. Extract ONLY the cooking steps into the instructions field
3. Remove any "Ingredients:" sections, headings, or lists from the instructions field
The suggestedTags array should contain 5-8 relevant tags based on the recipe, comments, and context (e.g., "easy", "quick", "vegetarian", "spicy", "dessert", "breakfast", "30-minutes", "one-pot", "gluten-free", etc.).
The enhancedTitle should be a clear, descriptive title that helps identify the recipe.
The enhancedDescription should describe the DISH itself - its characteristics, flavors, cooking method, difficulty, time, servings, etc. Do NOT mention the video or anything about watching it. Focus purely on describing the dish.
Return only the JSON object, no markdown formatting, no code blocks.`;
}

function cleanOpenAIResponse(content: string): string {
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleanedContent;
}

function createFallbackAnalysis(title: string, description: string): RecipeAnalysis {
  return {
    dishName: title || 'Unknown Dish',
    cuisineType: 'International',
    mainIngredients: [],
    ingredients: [],
    suggestedTags: [],
    enhancedTitle: title || 'Unknown Dish',
    enhancedDescription: description || 'Recipe information will be added later.',
  };
}

// Type guard function to validate RecipeAnalysis
function isRecipeAnalysis(obj: unknown): obj is RecipeAnalysis {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'dishName' in obj &&
    typeof (obj as { dishName: unknown }).dishName === 'string'
  );
}

function parseAndValidateResponse(cleanedContent: string, sanitizedTitle: string, sanitizedDescription: string): RecipeAnalysis {
  try {
    const parsed: unknown = JSON.parse(cleanedContent);
    
    if (typeof parsed === 'object' && parsed !== null && 'error' in parsed && !('dishName' in parsed)) {
      console.warn('OpenAI returned an error object. Creating fallback recipe data from available information.');
      return createFallbackAnalysis(sanitizedTitle, sanitizedDescription);
    }
    
    // Type guard to ensure parsed is RecipeAnalysis
    if (isRecipeAnalysis(parsed)) {
      return parsed;
    }
    
    // Fallback if parsing fails
    return createFallbackAnalysis(sanitizedTitle, sanitizedDescription);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response. Raw content:', cleanedContent.substring(0, 500));
    throw new Error(`Failed to parse JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

function validateAnalysisStructure(analysis: RecipeAnalysis, sanitizedTitle: string): RecipeAnalysis {
  if (analysis.dishName && analysis.cuisineType && Array.isArray(analysis.mainIngredients)) {
    return analysis;
  }
  
  console.error('Invalid OpenAI response structure. Received:', JSON.stringify(analysis, null, 2));
  
  const validated = { ...analysis };
  if (!validated.dishName) {
    validated.dishName = sanitizedTitle || 'Unknown Dish';
  }
  if (!validated.cuisineType) {
    validated.cuisineType = 'International';
  }
  if (!Array.isArray(validated.mainIngredients)) {
    validated.mainIngredients = [];
  }
  
  console.warn('Using fallback values for missing fields:', {
    dishName: validated.dishName,
    cuisineType: validated.cuisineType,
    mainIngredients: validated.mainIngredients
  });
  
  return validated;
}

export async function analyzeRecipe(
  title: string,
  description: string,
  comments?: string[]
): Promise<RecipeAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  // Sanitize inputs to prevent prompt injection
  const sanitizedTitle = sanitizeInput(title, 500);
  const sanitizedDescription = sanitizeInput(description.substring(0, 2000), 2000);
  const sanitizedComments = comments && comments.length > 0 
    ? comments.slice(0, 5).map(c => sanitizeInput(c, 2000))
    : [];

  const commentsText = buildCommentsText(sanitizedComments);
  const prompt = buildRecipePrompt(sanitizedTitle, sanitizedDescription, commentsText);

  try {
    const model = await getOpenAIModel();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts recipe information from video titles and descriptions. You MUST always return a valid JSON object with the required structure (dishName, cuisineType, mainIngredients, etc.), even if the video information is minimal. Never return an error object - always provide your best guess based on available information. Always return valid JSON only, no markdown, no code blocks, just the JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const cleanedContent = cleanOpenAIResponse(content);
    let analysis = parseAndValidateResponse(cleanedContent, sanitizedTitle, sanitizedDescription);
    analysis = validateAnalysisStructure(analysis, sanitizedTitle);

    return analysis;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze recipe with OpenAI: ${error.message}`);
    }
    throw error;
  }
}

export async function analyzeRecipeFromText(recipeText: string): Promise<RecipeAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  // Sanitize input to prevent prompt injection
  const sanitizedRecipeText = sanitizeInput(recipeText, 50000); // Max 50KB for recipe text

  const prompt = `Analyze the following recipe text and extract ALL relevant information. IMPORTANT: Convert ALL measurements to European/metric units.

Recipe Text:
${sanitizedRecipeText}

IMPORTANT CONVERSION RULES:
- Convert all liquid volumes to milliliters (ml), deciliters (dl), or liters (L)
  - 1 cup = 2.4 dl = 240 ml
  - 1 tablespoon (tbsp) = 15 ml
  - 1 teaspoon (tsp) = 5 ml
  - 1 fluid ounce (fl oz) = 30 ml
  - 1 pint = 4.7 dl = 470 ml
  - 1 quart = 9.5 dl = 950 ml
- Convert all weights to grams (g) or kilograms (kg)
  - 1 ounce (oz) = 28 g
  - 1 pound (lb) = 450 g = 0.45 kg
- Convert temperatures to Celsius (°C)
  - Fahrenheit to Celsius: (°F - 32) × 5/9
- Keep all other measurements in metric (cm, meters, etc.)

Extract and return a JSON object with the following structure:
{
  "dishName": "The name of the dish",
  "cuisineType": "The cuisine type (e.g., 'Indian', 'Italian', 'American', 'Japanese', 'Mexican', etc.)",
  "mainIngredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4", "ingredient5"],
  "ingredients": ["2 dl milk", "500 g flour", "3 eggs", "1 tsp salt", "etc."],
  "instructions": "ONLY the step-by-step cooking instructions. Do NOT include any ingredient lists, 'Ingredients:' headings, or ingredient measurements. Extract ONLY the actual cooking steps, methods, and techniques. Format clearly with numbered steps or paragraphs. Include cooking times, temperatures (in °C), and all important details.",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "enhancedTitle": "A clear, descriptive title for this recipe",
  "enhancedDescription": "A comprehensive description of the DISH itself - what it is, its flavors, textures, cooking method, difficulty level, time required, serving size, key techniques, etc. Describe the dish, NOT the video. Do not mention 'video', 'watch', or anything about viewing it."
}

The mainIngredients array should contain 3-5 key ingredient names (without amounts) that are essential to the dish.
The ingredients array should contain ALL ingredients with their amounts/measurements in European/metric units (e.g., "2 dl milk", "500 g flour", "3 eggs", "1 tsp salt"). IMPORTANT: Convert all measurements to European/metric units (ml/dl/L for liquids, g/kg for weights).
CRITICAL: The instructions field must contain ONLY the step-by-step cooking instructions. Do NOT include:
- Any ingredient lists (even if they appear in the recipe text)
- Any "Ingredients:" headings or sections
- Any ingredient measurements or amounts
- Any lines that list ingredients with quantities
- Only include the actual cooking steps, methods, and techniques

Format clearly with numbered steps or paragraphs. Include cooking times, temperatures (in °C), and all important details. IMPORTANT: Convert temperatures to Celsius (°F to °C: (°F - 32) × 5/9). 

If the recipe text contains both ingredients and instructions, you MUST:
1. Extract all ingredients (with amounts) into the ingredients array - these go in the "ingredients" field, NOT in "instructions"
2. Extract ONLY the cooking steps into the instructions field - this should be pure cooking instructions with no ingredient lists
3. Remove any "Ingredients:" sections, headings, or lists from the instructions field
4. The instructions field should start directly with cooking steps like "1. Heat the oil..." or "Preheat the oven to..." - never with ingredient lists

VERY IMPORTANT: When you see text like "Ingredients: 2 cups flour, 1 cup sugar..." in the recipe, put "2 dl flour, 1 dl sugar" in the ingredients array, and DO NOT include this text in the instructions field at all. The instructions should only contain steps like "Mix the flour and sugar", "Bake for 30 minutes", etc.
The suggestedTags array should contain 5-8 relevant tags based on the recipe (e.g., "easy", "quick", "vegetarian", "spicy", "dessert", "breakfast", "30-minutes", "one-pot", "gluten-free", etc.).
The enhancedTitle should be a clear, descriptive title that helps identify the recipe.
The enhancedDescription should describe the DISH itself - its characteristics, flavors, cooking method, difficulty, time, servings, etc. Do NOT mention the video or anything about watching it. Focus purely on describing the dish.
Return only the JSON object, no markdown formatting, no code blocks.`;

  try {
    const model = await getOpenAIModel();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts recipe information from recipe text. Always return valid JSON only, no markdown, no code blocks, just the JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the content - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let analysis: RecipeAnalysis;
    try {
      const parsed: unknown = JSON.parse(cleanedContent);
      if (isRecipeAnalysis(parsed)) {
        analysis = parsed;
      } else {
        throw new Error('Invalid RecipeAnalysis structure');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response (from text). Raw content:', cleanedContent.substring(0, 500));
      throw new Error(`Failed to parse JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate the response structure
    if (!analysis.dishName || !analysis.cuisineType || !Array.isArray(analysis.mainIngredients)) {
      console.error('Invalid OpenAI response structure (from text). Received:', JSON.stringify(analysis, null, 2));
      throw new Error(`Invalid response structure from OpenAI. Missing required fields: dishName=${!!analysis.dishName}, cuisineType=${!!analysis.cuisineType}, mainIngredients=${Array.isArray(analysis.mainIngredients)}`);
    }

    return analysis;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze recipe text with OpenAI: ${error.message}`);
    }
    throw error;
  }
}

export async function analyzeRecipeWithVision(thumbnailUrl: string, title: string, description: string): Promise<RecipeAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  try {
    // Fetch the thumbnail image
    const imageResponse = await fetch(thumbnailUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch thumbnail: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const prompt = `Analyze this recipe video thumbnail image and extract ALL relevant information. Also consider the video title and description provided.

Video Title: ${title}
Video Description: ${description.substring(0, 500)}

Look at the image carefully and identify:
- What dish is being prepared or shown
- What ingredients are visible
- Cooking techniques or methods visible
- Cuisine type
- Any other relevant details

Extract and return a JSON object with the following structure:
{
  "dishName": "The name of the dish based on what you see",
  "cuisineType": "The cuisine type (e.g., 'Indian', 'Italian', 'American', 'Japanese', 'Mexican', etc.)",
  "mainIngredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4", "ingredient5"],
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "enhancedTitle": "A clear, descriptive title for this dish based on what you see in the image. Do not include 'video' in the title.",
  "enhancedDescription": "A comprehensive description of the DISH itself based on what you observe - its appearance, flavors, textures, cooking method, visual characteristics, etc. Describe the dish, NOT the video. Do not mention 'video', 'watch', or anything about viewing it."
}

The mainIngredients array should contain 3-5 key ingredient names (without amounts) that you can identify or infer from the image.
The ingredients array should contain ingredients with estimated amounts in European/metric units based on what you see (e.g., "2 dl milk", "500 g flour"). If you cannot determine amounts, list ingredients without amounts.
The instructions should contain step-by-step cooking instructions based on what you observe in the image. If you cannot determine instructions from the image alone, leave this field empty or null.
The suggestedTags array should contain 5-8 relevant tags based on what you see (e.g., "easy", "quick", "vegetarian", "spicy", "dessert", "breakfast", "30-minutes", "one-pot", "gluten-free", etc.).
Return only the JSON object, no markdown formatting, no code blocks.`;

    const model = await getOpenAIModel();
    const completion = await openai.chat.completions.create({
      model, // Model is configurable via admin settings
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes recipe images and extracts recipe information. Always return valid JSON only, no markdown, no code blocks, just the JSON object.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the content - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let analysis: RecipeAnalysis;
    try {
      const parsed: unknown = JSON.parse(cleanedContent);
      if (isRecipeAnalysis(parsed)) {
        analysis = parsed;
      } else {
        throw new Error('Invalid RecipeAnalysis structure');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response (vision). Raw content:', cleanedContent.substring(0, 500));
      throw new Error(`Failed to parse JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate the response structure
    if (!analysis.dishName || !analysis.cuisineType || !Array.isArray(analysis.mainIngredients)) {
      console.error('Invalid OpenAI response structure (vision). Received:', JSON.stringify(analysis, null, 2));
      throw new Error(`Invalid response structure from OpenAI. Missing required fields: dishName=${!!analysis.dishName}, cuisineType=${!!analysis.cuisineType}, mainIngredients=${Array.isArray(analysis.mainIngredients)}`);
    }

    return analysis;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze recipe with vision: ${error.message}`);
    }
    throw error;
  }
}

export interface RecipeForShoppingList {
  id: string;
  dishName: string;
  ingredients: string[];
}

export async function generateShoppingList(recipes: RecipeForShoppingList[]): Promise<ShoppingListResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  // Separate recipes with and without ingredients
  const recipesWithIngredients = recipes.filter(r => r.ingredients && r.ingredients.length > 0);
  const missingRecipes = recipes.filter(r => !r.ingredients || r.ingredients.length === 0);

  // If no recipes have ingredients, return empty response
  if (recipesWithIngredients.length === 0) {
    return {
      sections: [],
      missingRecipes: missingRecipes.map(r => ({ id: r.id, dishName: r.dishName })),
      totalRecipes: recipes.length,
      recipesWithIngredients: 0,
    };
  }

  // Build ingredients list with recipe context
  const ingredientsList = recipesWithIngredients.map(recipe => {
    const ingredientsText = recipe.ingredients.join('\n');
    return `Recipe: ${recipe.dishName}\nIngredients:\n${ingredientsText}`;
  }).join('\n\n');

  // Sanitize input
  const sanitizedIngredients = sanitizeInput(ingredientsList, 10000);

  const prompt = `You are organizing a shopping list for multiple recipes. Your task is to combine all ingredients from the recipes below and organize them into logical supermarket sections.

Recipes and their ingredients:
${sanitizedIngredients}

IMPORTANT INSTRUCTIONS:
1. Combine all ingredients from all recipes into a single shopping list
2. Consolidate duplicate ingredients by adding their amounts together (e.g., "2 dl milk" + "1 dl milk" = "3 dl milk")
3. If amounts can't be easily combined (different units or unclear amounts), list them separately
4. REMOVE ALL PREPARATION INSTRUCTIONS: Strip out any preparation details like "chopped", "sliced", "peeled", "diced", "coarsely chopped", "finely chopped", etc. Just list the raw ingredient.
5. REMOVE PREPARED VOLUMES: Ignore volume measurements that refer to prepared/cut ingredients (e.g., "about 300 ml" after chopping). Only keep the original quantity needed.
6. SIMPLIFY TO BASIC SHOPPING LIST FORMAT: List ingredients in their simplest form - just the ingredient name and basic quantity needed. Examples:
   - "1 small yellow onion, coarsely chopped (about 300 ml)" → "1 onion"
   - "2 celery ribs, sliced 1/8" thick (about 300 ml)" → "2 celery ribs" or "2 stalks celery"
   - "1 large carrot, peeled, halved lengthwise, sliced 1/8" thick (about 240 ml)" → "1 carrot" or "1 large carrot"
   - "60 ml finely chopped fresh parsley" → "parsley" or "fresh parsley" (estimate quantity if needed)
7. Organize ingredients into logical supermarket sections such as:
   - Produce (fruits, vegetables, fresh herbs)
   - Meat & Seafood (chicken, beef, fish, etc.)
   - Dairy (milk, cheese, butter, yogurt, etc.)
   - Spices & Seasonings (salt, pepper, spices, herbs, etc.)
   - Pantry (flour, sugar, oil, canned goods, etc.)
   - Bakery (bread, rolls, etc.)
   - Frozen (if applicable)
   - Other (anything that doesn't fit the above categories)
8. Keep measurements simple and in metric units (ml, dl, L, g, kg, etc.) when applicable, but prioritize simplicity

Return ONLY a valid JSON object with this structure:
{
  "sections": [
    {
      "name": "Section Name",
      "ingredients": ["ingredient with amount", "another ingredient"]
    }
  ]
}

Example:
{
  "sections": [
    {
      "name": "Produce",
      "ingredients": ["2 carrots", "1 onion", "2 celery ribs", "fresh parsley"]
    },
    {
      "name": "Dairy",
      "ingredients": ["3 dl milk", "200 g butter"]
    },
    {
      "name": "Pantry",
      "ingredients": ["500 g flour", "2 dl olive oil", "1 tsp salt"]
    }
  ]
}

Remember: Keep it simple and generic - this is a shopping list, not a recipe. Remove all preparation instructions and keep only the basic ingredient names with simple quantities.

Return only the JSON object, no markdown formatting, no code blocks, no additional text.`;

  try {
    const model = await getOpenAIModel();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that organizes shopping lists by supermarket sections. Always return valid JSON only, no markdown, no code blocks, just the JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the content - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let shoppingList: { sections: Array<{ name: string; ingredients: string[] }> };
    try {
      shoppingList = JSON.parse(cleanedContent) as { sections: Array<{ name: string; ingredients: string[] }> };
    } catch (parseError) {
      console.error('Failed to parse OpenAI shopping list response. Raw content:', cleanedContent.substring(0, 500));
      throw new Error(`Failed to parse JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate the response structure
    if (!Array.isArray(shoppingList.sections)) {
      console.error('Invalid OpenAI shopping list response structure. Received:', JSON.stringify(shoppingList, null, 2));
      throw new Error('Invalid response structure from OpenAI: sections must be an array');
    }

    return {
      sections: shoppingList.sections,
      missingRecipes: missingRecipes.map(r => ({ id: r.id, dishName: r.dishName })),
      totalRecipes: recipes.length,
      recipesWithIngredients: recipesWithIngredients.length,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate shopping list with OpenAI: ${error.message}`);
    }
    throw error;
  }
}
