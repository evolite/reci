/**
 * Download recipe thumbnails into local storage.
 *
 * Two-stage recovery per recipe:
 *   1. Try the stored thumbnailUrl.
 *   2. If that fails, re-fetch metadata from videoUrl. Signed CDN URLs
 *      (TikTok in particular) expire, but the video page still resolves, so
 *      this yields a fresh URL which is then stored and written back.
 *
 * Usage:
 *   npm run backfill:images          # only recipes without a local image
 *   npm run backfill:images -- --force   # re-download everything
 */
import { prisma } from '../lib/prisma';
import { storeRecipeImage } from '../services/imageService';
import { getVideoMetadata } from '../services/videoService';

type Outcome = 'stored' | 'recovered' | 'skipped' | 'failed';

const force = process.argv.includes('--force');

async function processRecipe(recipe: {
  id: string;
  dishName: string;
  thumbnailUrl: string;
  videoUrl: string;
  imagePath: string | null;
}): Promise<Outcome> {
  if (recipe.imagePath && !force) {
    return 'skipped';
  }

  // Stage 1: the URL we already have.
  if (recipe.thumbnailUrl) {
    const imagePath = await storeRecipeImage(recipe.id, recipe.thumbnailUrl);
    if (imagePath) {
      await prisma.recipe.update({ where: { id: recipe.id }, data: { imagePath } });
      return 'stored';
    }
  }

  // Stage 2: re-derive a fresh thumbnail URL from the video page.
  if (!recipe.videoUrl) {
    return 'failed';
  }

  try {
    const metadata = await getVideoMetadata(recipe.videoUrl);
    if (!metadata.thumbnailUrl || metadata.thumbnailUrl === recipe.thumbnailUrl) {
      return 'failed';
    }

    const imagePath = await storeRecipeImage(recipe.id, metadata.thumbnailUrl);
    if (!imagePath) {
      return 'failed';
    }

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { imagePath, thumbnailUrl: metadata.thumbnailUrl },
    });
    return 'recovered';
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`  re-fetch failed for ${recipe.id}: ${reason}`);
    return 'failed';
  }
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: { id: true, dishName: true, thumbnailUrl: true, videoUrl: true, imagePath: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Backfilling images for ${recipes.length} recipes${force ? ' (--force)' : ''}\n`);

  const totals: Record<Outcome, number> = { stored: 0, recovered: 0, skipped: 0, failed: 0 };
  const failures: string[] = [];

  for (const recipe of recipes) {
    const outcome = await processRecipe(recipe);
    totals[outcome] += 1;

    if (outcome !== 'skipped') {
      const label = outcome === 'recovered' ? 'recovered via re-fetch' : outcome;
      console.log(`  [${label}] ${recipe.dishName}`);
    }
    if (outcome === 'failed') {
      failures.push(`${recipe.dishName} (${recipe.id})`);
    }
  }

  console.log(
    `\nstored=${totals.stored} recovered=${totals.recovered} skipped=${totals.skipped} failed=${totals.failed}`
  );

  if (failures.length > 0) {
    console.log('\nStill without a local image:');
    for (const failure of failures) {
      console.log(`  - ${failure}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
