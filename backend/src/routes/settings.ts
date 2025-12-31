import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { clearModelCache } from '../services/openaiService';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// GET /api/settings - Get all settings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
    
    // Convert to key-value object
    const settingsObj: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/:key - Get a specific setting
router.get('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ key: setting.key, value: setting.value, description: setting.description });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/:key - Update a setting
router.put('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value,
        ...(description !== undefined && { description }),
      },
      create: {
        key,
        value,
        description: description || null,
      },
    });
    
    // Clear model cache if OpenAI model was updated
    if (key === 'openai_model') {
      clearModelCache();
    }
    
    res.json({ key: setting.key, value: setting.value, description: setting.description });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
