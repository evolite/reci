import OpenAI from 'openai';
import { RecipeAnalysis } from '../models/Recipe';
import { sanitizeInput } from '../utils/validation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  // Build comments text to avoid nested template literals
  const commentsList = sanitizedComments.length > 0
    ? sanitizedComments.map((c, i) => `${i + 1}. ${c}`).join('\n\n')
    : '';
  const commentsText = commentsList
    ? `\n\nTop Comments from viewers (these often contain full recipes):\n${commentsList}`
    : '';

  const prompt = `Analyze the following YouTube video about a recipe and extract ALL relevant information. Return ONLY a valid JSON object with no additional text.

Video Title: ${sanitizedTitle}
Video Description: ${sanitizedDescription}${commentsText}

IMPORTANT: The comments section often contains the FULL RECIPE with ingredients and step-by-step instructions. Pay special attention to comments that list ingredients, measurements, cooking times, temperatures, and step-by-step instructions. Extract the complete recipe text if found.

Extract and return a JSON object with the following structure:
{
  "dishName": "The name of the dish (e.g., 'Chicken Tikka Masala', 'Chocolate Chip Cookies')",
  "cuisineType": "The cuisine type (e.g., 'Indian', 'Italian', 'American', 'Japanese', 'Mexican', etc.)",
  "mainIngredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4", "ingredient5"],
  "ingredients": ["2 dl milk", "500 g flour", "3 eggs", "1 tsp salt", "etc."],
  "instructions": "ONLY the step-by-step cooking instructions. Do NOT include any ingredient lists, 'Ingredients:' headings, or ingredient measurements. Extract ONLY the actual cooking steps, methods, and techniques. Format clearly with numbered steps or paragraphs. Include cooking times, temperatures (in °C), and all important details.",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "enhancedTitle": "A clear, descriptive title for this dish/recipe (more informative than the YouTube title if possible, or use the YouTube title if it's already good). Do not include 'video' or 'YouTube' in the title.",
  "enhancedDescription": "A comprehensive description of the DISH itself - what it is, what makes it special, its flavors, textures, cooking method, difficulty level, time required, serving size, etc. Describe the dish, NOT the video. Do not mention 'video', 'YouTube', 'watch', or anything about viewing it."
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
The enhancedDescription should describe the DISH itself - its characteristics, flavors, cooking method, difficulty, time, servings, etc. Do NOT mention the video, YouTube, or anything about watching it. Focus purely on describing the dish.
Return only the JSON object, no markdown formatting, no code blocks.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts recipe information from video titles and descriptions. Always return valid JSON only, no markdown, no code blocks, just the JSON object.',
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
      analysis = JSON.parse(cleanedContent) as RecipeAnalysis;
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate the response structure
    if (!analysis.dishName || !analysis.cuisineType || !Array.isArray(analysis.mainIngredients)) {
      throw new Error('Invalid response structure from OpenAI');
    }

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
  "enhancedDescription": "A comprehensive description of the DISH itself - what it is, its flavors, textures, cooking method, difficulty level, time required, serving size, key techniques, etc. Describe the dish, NOT the video. Do not mention 'video', 'YouTube', 'watch', or anything about viewing it."
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
The enhancedDescription should describe the DISH itself - its characteristics, flavors, cooking method, difficulty, time, servings, etc. Do NOT mention the video, YouTube, or anything about watching it. Focus purely on describing the dish.
Return only the JSON object, no markdown formatting, no code blocks.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
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
      analysis = JSON.parse(cleanedContent) as RecipeAnalysis;
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate the response structure
    if (!analysis.dishName || !analysis.cuisineType || !Array.isArray(analysis.mainIngredients)) {
      throw new Error('Invalid response structure from OpenAI');
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
  "enhancedTitle": "A clear, descriptive title for this dish based on what you see in the image. Do not include 'video' or 'YouTube' in the title.",
  "enhancedDescription": "A comprehensive description of the DISH itself based on what you observe - its appearance, flavors, textures, cooking method, visual characteristics, etc. Describe the dish, NOT the video. Do not mention 'video', 'YouTube', 'watch', or anything about viewing it."
}

The mainIngredients array should contain 3-5 key ingredient names (without amounts) that you can identify or infer from the image.
The ingredients array should contain ingredients with estimated amounts in European/metric units based on what you see (e.g., "2 dl milk", "500 g flour"). If you cannot determine amounts, list ingredients without amounts.
The instructions should contain step-by-step cooking instructions based on what you observe in the image. If you cannot determine instructions from the image alone, leave this field empty or null.
The suggestedTags array should contain 5-8 relevant tags based on what you see (e.g., "easy", "quick", "vegetarian", "spicy", "dessert", "breakfast", "30-minutes", "one-pot", "gluten-free", etc.).
Return only the JSON object, no markdown formatting, no code blocks.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4o supports vision
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
      analysis = JSON.parse(cleanedContent) as RecipeAnalysis;
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate the response structure
    if (!analysis.dishName || !analysis.cuisineType || !Array.isArray(analysis.mainIngredients)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return analysis;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze recipe with vision: ${error.message}`);
    }
    throw error;
  }
}
