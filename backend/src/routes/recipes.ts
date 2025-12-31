import { Router, Request, Response } from 'express';
import { getVideoMetadata } from '../services/videoService';
import { analyzeRecipe, analyzeRecipeWithVision, analyzeRecipeFromText, generateShoppingList } from '../services/openaiService';
import { CreateRecipeInput, ShoppingListRequest } from '../models/Recipe';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { analyzeAndUpdateRecipe, prepareUpdateData } from './recipeHelpers';
import { validateVideoUrl } from '../utils/validation';

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
        videoUrl: true,
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
    const { videoUrl }: CreateRecipeInput = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    const validation = validateVideoUrl(videoUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid URL' });
    }

    // Check if recipe already exists
    const existing = await prisma.recipe.findUnique({
      where: { videoUrl },
    });

    if (existing) {
      return res.status(409).json({ error: 'Recipe already exists', recipe: existing });
    }

    // Fetch video metadata (including comments)
    const metadata = await getVideoMetadata(videoUrl);

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
        metadata.title, // Pass video title for context
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
        videoUrl,
        videoPlatform: metadata.platform || null,
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

    // Check recipe exists and user has permission
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (existing.userId !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to update this recipe' });
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

    // Validate input fields
    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ error: 'description must be a string' });
      }
      if (description.length > 10000) {
        return res.status(400).json({ error: 'description must be 10000 characters or less' });
      }
    }

    if (dishName !== undefined) {
      if (typeof dishName !== 'string') {
        return res.status(400).json({ error: 'dishName must be a string' });
      }
      if (dishName.length === 0) {
        return res.status(400).json({ error: 'dishName cannot be empty' });
      }
      if (dishName.length > 200) {
        return res.status(400).json({ error: 'dishName must be 200 characters or less' });
      }
    }

    if (cuisineType !== undefined) {
      if (typeof cuisineType !== 'string') {
        return res.status(400).json({ error: 'cuisineType must be a string' });
      }
      if (cuisineType.length > 100) {
        return res.status(400).json({ error: 'cuisineType must be 100 characters or less' });
      }
    }

    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'ingredients must be an array' });
      }
      if (ingredients.length > 500) {
        return res.status(400).json({ error: 'ingredients array must have 500 items or less' });
      }
      for (const ingredient of ingredients) {
        if (typeof ingredient !== 'string') {
          return res.status(400).json({ error: 'All ingredients must be strings' });
        }
      }
    }

    if (instructions !== undefined && instructions !== null) {
      if (typeof instructions !== 'string') {
        return res.status(400).json({ error: 'instructions must be a string or null' });
      }
      if (instructions.length > 50000) {
        return res.status(400).json({ error: 'instructions must be 50000 characters or less' });
      }
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: 'tags must be an array' });
      }
      if (tags.length > 50) {
        return res.status(400).json({ error: 'tags array must have 50 items or less' });
      }
      for (const tag of tags) {
        if (typeof tag !== 'string') {
          return res.status(400).json({ error: 'All tags must be strings' });
        }
        if (tag.length > 50) {
          return res.status(400).json({ error: 'Each tag must be 50 characters or less' });
        }
      }
    }

    // Get existing recipe to check if instructions changed
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check authorization - users can only modify their own recipes, admins can modify any
    if (existing.userId !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to update this recipe' });
    }

    // Prepare update data from request body
    let updateData: any;
    try {
      const prepared = prepareUpdateData({ description, dishName, cuisineType, ingredients, instructions, tags });
      updateData = prepared.updateData;
      
      // If instructions is provided and were previously empty, analyze it
      if (prepared.hasInstructions && prepared.instructionsValue) {
        const existingInstructions = existing.instructions || '';
        const newInstructions = prepared.instructionsValue;
        
        // Only analyze if instructions were previously empty and new content is substantial
        if (!existingInstructions && newInstructions.trim().length > 50) {
          const analysisResult = await analyzeAndUpdateRecipe(newInstructions, {
            description: existing.description,
            tags: existing.tags || [],
          });
          
          // Merge analysis results, but don't override explicitly provided fields
          if (description === undefined && analysisResult.description) {
            updateData.description = analysisResult.description;
          }
          if (dishName === undefined && analysisResult.dishName) {
            updateData.dishName = analysisResult.dishName;
          }
          if (cuisineType === undefined && analysisResult.cuisineType) {
            updateData.cuisineType = analysisResult.cuisineType;
          }
          if (ingredients === undefined && analysisResult.ingredients) {
            updateData.ingredients = analysisResult.ingredients;
          }
          if (analysisResult.instructions) {
            updateData.instructions = analysisResult.instructions;
          }
          if (tags === undefined && analysisResult.tags) {
            updateData.tags = analysisResult.tags;
          }
        } else {
          // Instructions already existed or too short - just save
          updateData.instructions = newInstructions;
        }
      } else if (prepared.hasInstructions) {
        // Instructions is null or empty
        updateData.instructions = null;
      }
    } catch (validationError) {
      if (validationError instanceof Error) {
        return res.status(400).json({ error: validationError.message });
      }
      throw validationError;
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

// POST /api/recipes/:id/rescrape - Re-scrape video data and re-analyze
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

    // Check authorization
    if (existing.userId !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to rescrape this recipe' });
    }

    // Validate URL
    const validation = validateVideoUrl(existing.videoUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid URL' });
    }

    // Fetch metadata (including comments)
    const metadata = await getVideoMetadata(existing.videoUrl);

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
        videoPlatform: metadata.platform || existing.videoPlatform,
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

// POST /api/recipes/:id/rescrape-and-analyze - Re-scrape video data and analyze with both text and vision
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

    // Check authorization
    if (existing.userId !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to rescrape this recipe' });
    }

    // Validate URL
    const validation = validateVideoUrl(existing.videoUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid URL' });
    }

    // Fetch metadata (including comments)
    const metadata = await getVideoMetadata(existing.videoUrl);

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
        videoPlatform: metadata.platform || existing.videoPlatform,
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

    // Check authorization
    if (existing.userId !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to analyze this recipe' });
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

    // Check recipe exists and user has permission
    const recipe = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check authorization - users can only delete their own recipes, admins can delete any
    if (recipe.userId !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }

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

// POST /api/recipes/shopping-list - Generate shopping list from multiple recipes
router.post('/shopping-list', async (req: AuthRequest, res: Response) => {
  try {
    const { recipeIds }: ShoppingListRequest = req.body;

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds must be a non-empty array' });
    }

    // Fetch all selected recipes
    const recipes = await prisma.recipe.findMany({
      where: {
        id: { in: recipeIds },
      },
      select: {
        id: true,
        dishName: true,
        ingredients: true,
      },
    });

    if (recipes.length === 0) {
      return res.status(404).json({ error: 'No recipes found with the provided IDs' });
    }

    // Prepare recipes for shopping list generation
    const recipesForShoppingList = recipes.map(recipe => ({
      id: recipe.id,
      dishName: recipe.dishName,
      ingredients: recipe.ingredients || [],
    }));

    // Generate shopping list using OpenAI
    const shoppingList = await generateShoppingList(recipesForShoppingList);

    res.json(shoppingList);
  } catch (error) {
    console.error('Error generating shopping list:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
