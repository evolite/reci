import { Router, Request, Response } from 'express';
import { extractVideoId, getVideoMetadata } from '../services/youtubeService';
import { analyzeRecipe, analyzeRecipeWithVision, analyzeRecipeFromText } from '../services/openaiService';
import { CreateRecipeInput } from '../models/Recipe';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/recipes/public - Get public recipes for landing page (no auth required)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      take: 12, // Limit to 12 recipes for showcase
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        dishName: true,
        description: true,
        thumbnailUrl: true,
        youtubeUrl: true,
        cuisineType: true,
        tags: true,
        createdAt: true,
      },
    });
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching public recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All other routes require authentication
router.use(authenticate);

// POST /api/recipes - Add new recipe
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { youtubeUrl }: CreateRecipeInput = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'youtubeUrl is required' });
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Check if recipe already exists
    const existing = await prisma.recipe.findUnique({
      where: { youtubeUrl },
    });

    if (existing) {
      return res.status(409).json({ error: 'Recipe already exists', recipe: existing });
    }

    // Fetch YouTube metadata (including comments)
    const metadata = await getVideoMetadata(videoId);

    // Analyze with OpenAI text analysis (including comments for better context)
    const textAnalysis = await analyzeRecipe(
      metadata.title, 
      metadata.description,
      metadata.topComments
    );

    // Analyze with GPT-Vision using the thumbnail
    let visionAnalysis;
    try {
      visionAnalysis = await analyzeRecipeWithVision(
        metadata.thumbnailUrl,
        metadata.title, // Pass YouTube title for context
        metadata.description
      );
    } catch (visionError) {
      console.error('Vision analysis failed, using text analysis only:', visionError);
      // Continue with text analysis if vision fails
    }

    // Merge text and vision analysis (vision takes priority for visual data, text for recipe content)
    const finalAnalysis = visionAnalysis ? {
      dishName: visionAnalysis.dishName || textAnalysis.dishName,
      cuisineType: visionAnalysis.cuisineType || textAnalysis.cuisineType,
      mainIngredients: visionAnalysis.mainIngredients.length > 0 
        ? visionAnalysis.mainIngredients 
        : textAnalysis.mainIngredients,
      ingredients: textAnalysis.ingredients || visionAnalysis.ingredients || [],
      instructions: textAnalysis.instructions || visionAnalysis.instructions || null,
      suggestedTags: [...new Set([
        ...(visionAnalysis.suggestedTags || []),
        ...(textAnalysis.suggestedTags || [])
      ])],
      enhancedDescription: visionAnalysis.enhancedDescription || textAnalysis.enhancedDescription || metadata.description,
    } : textAnalysis;

    // Create recipe in database with OpenAI-enhanced data
    const recipe = await prisma.recipe.create({
      data: {
        youtubeUrl,
        thumbnailUrl: metadata.thumbnailUrl,
        description: finalAnalysis.enhancedDescription || metadata.description,
        dishName: finalAnalysis.dishName,
        cuisineType: finalAnalysis.cuisineType,
        ingredients: finalAnalysis.ingredients || [],
        tags: finalAnalysis.suggestedTags || [],
        instructions: finalAnalysis.instructions || null,
        userId: req.userId || null,
      },
    });

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/recipes - Get all recipes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recipes/search?q=... - Search recipes
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = query.trim().toLowerCase();

    // Get all recipes and filter in memory to support case-insensitive ingredient search
    const allRecipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const filteredRecipes = allRecipes.filter((recipe) => {
      const matchesText =
        recipe.dishName.toLowerCase().includes(searchTerm) ||
        recipe.cuisineType.toLowerCase().includes(searchTerm) ||
        recipe.description.toLowerCase().includes(searchTerm);
      
      const matchesIngredient = recipe.ingredients.some((ingredient) =>
        ingredient.toLowerCase().includes(searchTerm)
      );

      const matchesTag = (recipe.tags || []).some((tag: string) =>
        tag.toLowerCase().includes(searchTerm)
      );

      return matchesText || matchesIngredient || matchesTag;
    });

    res.json(filteredRecipes);
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recipes/random - Get random recipe
router.get('/random', async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.recipe.count();

    if (count === 0) {
      return res.status(404).json({ error: 'No recipes found' });
    }

    const skip = Math.floor(Math.random() * count);
    const recipe = await prisma.recipe.findFirst({
      skip,
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(recipe);
  } catch (error) {
    console.error('Error fetching random recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recipes/:id - Get single recipe
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/recipes/:id/tags - Update recipe tags
router.patch('/:id/tags', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'tags must be an array' });
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        tags: tags.filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0),
      },
    });

    res.json(recipe);
  } catch (error) {
    console.error('Error updating recipe tags:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/recipes/:id - Update recipe fields
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description, dishName, cuisineType, ingredients, instructions, tags } = req.body;

    // Get existing recipe to check if instructions changed
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const updateData: any = {};
    let analyzedInstructions = false; // Track if we've set instructions from analysis
    
    // If instructions is provided and different from existing, analyze it to update other fields
    // BUT only if instructions were previously empty (i.e., pasting from new page)
    // If instructions already existed, it's an edit, so don't analyze
    if (instructions !== undefined) {
      const newInstructions = instructions === null || instructions === '' ? null : String(instructions);
      const existingInstructions = existing.instructions || '';
      
      // If instructions were previously empty/null and now have content, analyze it (new page paste)
      // If instructions already existed, just save without analysis (edit mode)
      if (!existingInstructions && newInstructions && newInstructions.trim().length > 50) {
        try {
          const analysis = await analyzeRecipeFromText(newInstructions);
          
          // Auto-update fields from analysis if they weren't explicitly provided
          if (description === undefined) updateData.description = analysis.enhancedDescription || existing.description;
          if (dishName === undefined) updateData.dishName = analysis.dishName;
          if (cuisineType === undefined) updateData.cuisineType = analysis.cuisineType;
          
          // Use the extracted ingredients from analysis - this is the key fix
          if (analysis.ingredients && analysis.ingredients.length > 0) {
            updateData.ingredients = analysis.ingredients;
          }
          
          // Use the extracted instructions from analysis (already cleaned by OpenAI)
          if (analysis.instructions) {
            // Additional cleaning to ensure no ingredient lists remain
            let cleanedInstructions = analysis.instructions;
            // Remove "Ingredients:" headings and everything until "Instructions:" or "Steps:" or "Method:" or "Directions:"
            cleanedInstructions = cleanedInstructions.replace(/^Ingredients?:?\s*\n.*?(?=\n(?:Instructions?|Steps?|Method|Directions?|$))/ims, '');
            cleanedInstructions = cleanedInstructions.replace(/^.*?Ingredients?:?\s*\n.*?(?=\n(?:Instructions?|Steps?|Method|Directions?|$))/ims, '');
            // Remove bullet points or numbered lists that look like ingredients (contain measurements)
            cleanedInstructions = cleanedInstructions.replace(/^[\s]*[•\-\*]\s*[\d\/\s]+(?:oz|cup|cups|tbsp|tsp|lb|pound|ounce|fl\s*oz|g|kg|ml|dl|l)[\s\w\s,()]+$/gim, '');
            // Remove lines that start with numbers/letters followed by measurements (common ingredient list format)
            cleanedInstructions = cleanedInstructions.replace(/^[\s]*[\d\w]+\.?\s+[\d\/\s]+(?:oz|cup|cups|tbsp|tsp|lb|pound|ounce|fl\s*oz|g|kg|ml|dl|l)[\s\w\s,()]+$/gim, '');
            // Remove any remaining "Ingredients:" text
            cleanedInstructions = cleanedInstructions.replace(/Ingredients?:?\s*/gi, '');
            updateData.instructions = cleanedInstructions.trim();
            analyzedInstructions = true; // Mark that we've set cleaned instructions
          }
          
          // Merge suggested tags with existing tags
          if (tags === undefined) {
            const existingTags = existing.tags || [];
            const suggestedTags = analysis.suggestedTags || [];
            updateData.tags = [...new Set([...existingTags, ...suggestedTags])];
          }
        } catch (error) {
          console.error('Error analyzing recipe:', error);
          // Continue with manual update even if analysis fails
          if (newInstructions) {
            updateData.instructions = newInstructions;
            analyzedInstructions = true;
          }
        }
      } else {
        // Instructions already existed (edit mode) or too short - just save without analysis
        if (newInstructions !== undefined) {
          updateData.instructions = newInstructions;
          analyzedInstructions = true;
        }
      }
    }
    
    // Handle explicit field updates (these override auto-updates)
    if (description !== undefined) updateData.description = String(description);
    if (dishName !== undefined) updateData.dishName = String(dishName);
    if (cuisineType !== undefined) updateData.cuisineType = String(cuisineType);
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'ingredients must be an array' });
      }
      updateData.ingredients = ingredients.filter((ing: any) => typeof ing === 'string' && ing.trim().length > 0);
    }
    // Only override instructions if we haven't already set them from analysis
    if (instructions !== undefined && !analyzedInstructions) {
      updateData.instructions = instructions === null || instructions === '' ? null : String(instructions);
    }
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: 'tags must be an array' });
      }
      updateData.tags = tags.filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: updateData,
    });

    res.json(recipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recipes/:id/rescrape - Re-scrape YouTube data and re-analyze
router.post('/:id/rescrape', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get existing recipe
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Extract video ID
    const videoId = extractVideoId(existing.youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Fetch YouTube metadata (including comments)
    const metadata = await getVideoMetadata(videoId);

    // Analyze with OpenAI (including comments for better context)
    const analysis = await analyzeRecipe(
      metadata.title, 
      metadata.description,
      metadata.topComments
    );

    // Merge suggested tags with existing tags (avoid duplicates)
    const existingTags = existing.tags || [];
    const suggestedTags = analysis.suggestedTags || [];
    const mergedTags = [...new Set([...existingTags, ...suggestedTags])];

    // Update recipe with new data (using OpenAI-enhanced fields)
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        thumbnailUrl: metadata.thumbnailUrl,
        description: analysis.enhancedDescription || metadata.description,
        dishName: analysis.dishName,
        cuisineType: analysis.cuisineType,
        ingredients: analysis.ingredients || existing.ingredients,
        tags: mergedTags,
        instructions: analysis.instructions || existing.instructions,
      },
    });

    res.json(recipe);
  } catch (error) {
    console.error('Error re-scraping recipe:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/recipes/:id/rescrape-and-analyze - Re-scrape YouTube data and analyze with both text and vision
router.post('/:id/rescrape-and-analyze', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get existing recipe
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Extract video ID
    const videoId = extractVideoId(existing.youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Fetch YouTube metadata (including comments)
    const metadata = await getVideoMetadata(videoId);

    // Analyze with OpenAI text analysis (including comments for better context)
    const textAnalysis = await analyzeRecipe(
      metadata.title, 
      metadata.description,
      metadata.topComments
    );

    // Analyze with GPT-Vision using the thumbnail
    let visionAnalysis;
    try {
      visionAnalysis = await analyzeRecipeWithVision(
        metadata.thumbnailUrl,
        metadata.title,
        metadata.description
      );
    } catch (visionError) {
      console.error('Vision analysis failed, using text analysis only:', visionError);
      // Continue with text analysis if vision fails
    }

    // Merge text and vision analysis (vision takes priority for visual data, text for recipe content)
    const finalAnalysis = visionAnalysis ? {
      dishName: visionAnalysis.dishName || textAnalysis.dishName,
      cuisineType: visionAnalysis.cuisineType || textAnalysis.cuisineType,
      mainIngredients: visionAnalysis.mainIngredients.length > 0 
        ? visionAnalysis.mainIngredients 
        : textAnalysis.mainIngredients,
      suggestedTags: [...new Set([
        ...(visionAnalysis.suggestedTags || []),
        ...(textAnalysis.suggestedTags || [])
      ])],
      enhancedDescription: visionAnalysis.enhancedDescription || textAnalysis.enhancedDescription || metadata.description,
      ingredients: textAnalysis.ingredients || visionAnalysis.ingredients || [],
      instructions: textAnalysis.instructions || visionAnalysis.instructions || null,
    } : textAnalysis;

    // Merge suggested tags with existing tags (avoid duplicates)
    const existingTags = existing.tags || [];
    const suggestedTags = finalAnalysis.suggestedTags || [];
    const mergedTags = [...new Set([...existingTags, ...suggestedTags])];

    // Update recipe with new data (using OpenAI-enhanced fields)
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        thumbnailUrl: metadata.thumbnailUrl,
        description: finalAnalysis.enhancedDescription || metadata.description,
        dishName: finalAnalysis.dishName,
        cuisineType: finalAnalysis.cuisineType,
        ingredients: finalAnalysis.ingredients || existing.ingredients,
        tags: mergedTags,
        instructions: finalAnalysis.instructions || existing.instructions,
      },
    });

    res.json(recipe);
  } catch (error) {
    console.error('Error re-scraping and analyzing recipe:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/recipes/:id/analyze-vision - Analyze recipe using GPT-Vision
router.post('/:id/analyze-vision', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get existing recipe
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Analyze thumbnail with GPT-Vision
    const analysis = await analyzeRecipeWithVision(
      existing.thumbnailUrl,
      existing.dishName,
      existing.description
    );

    // Merge suggested tags with existing tags
    const existingTags = existing.tags || [];
    const suggestedTags = analysis.suggestedTags || [];
    const mergedTags = [...new Set([...existingTags, ...suggestedTags])];

    // Update recipe with vision analysis
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        description: analysis.enhancedDescription || existing.description,
        dishName: analysis.dishName,
        cuisineType: analysis.cuisineType,
        ingredients: analysis.ingredients || existing.ingredients,
        instructions: analysis.instructions || existing.instructions,
        tags: mergedTags,
      },
    });

    res.json(recipe);
  } catch (error) {
    console.error('Error analyzing recipe with vision:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// DELETE /api/recipes/:id - Delete recipe
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.recipe.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
