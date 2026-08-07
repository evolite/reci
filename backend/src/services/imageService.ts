import fs from 'node:fs';
import path from 'node:path';
import { validateVideoUrl } from '../utils/validation';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/**
 * Images live beside the SQLite file so they land in the same persistent volume.
 * Falls back to ./data/images for local development.
 */
function resolveImageDir(): string {
  if (process.env.IMAGE_DIR) {
    return path.resolve(process.env.IMAGE_DIR);
  }

  const databaseUrl = process.env.DATABASE_URL || '';
  const fileMatch = /^file:(.+)$/.exec(databaseUrl);
  if (fileMatch) {
    return path.join(path.dirname(path.resolve(fileMatch[1])), 'images');
  }

  return path.join(process.cwd(), 'data', 'images');
}

export const IMAGE_DIR = resolveImageDir();

/** Public URL prefix these files are served under (see server.ts). */
export const IMAGE_ROUTE = '/images';

export function ensureImageDir(): void {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

/**
 * Remove any previously stored image for this recipe, whatever its extension.
 * Keeps re-analyze from leaving orphaned files behind when the format changes.
 */
function removeExistingImages(recipeId: string): void {
  for (const extension of new Set(Object.values(EXTENSION_BY_MIME))) {
    const candidate = path.join(IMAGE_DIR, `${recipeId}${extension}`);
    if (fs.existsSync(candidate)) {
      fs.rmSync(candidate, { force: true });
    }
  }
}

/**
 * Download a thumbnail and store it locally.
 *
 * Returns the public path (e.g. "/images/<id>.jpg") or null when the image
 * could not be retrieved. Never throws: a missing thumbnail must not fail
 * recipe creation or re-analysis.
 */
export async function storeRecipeImage(recipeId: string, imageUrl: string): Promise<string | null> {
  if (!recipeId || !imageUrl) {
    return null;
  }

  // Same SSRF guard used for video URLs: http(s) only, no private hosts.
  const validation = validateVideoUrl(imageUrl);
  if (!validation.valid) {
    console.warn(`Refusing to fetch image for recipe ${recipeId}: ${validation.error}`);
    return null;
  }

  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`Image fetch for recipe ${recipeId} returned ${response.status}`);
      return null;
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extension = EXTENSION_BY_MIME[contentType];
    if (!extension) {
      console.warn(`Unsupported image content-type "${contentType}" for recipe ${recipeId}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      console.warn(`Image for recipe ${recipeId} has unusable size ${buffer.length}`);
      return null;
    }

    ensureImageDir();
    removeExistingImages(recipeId);

    const fileName = `${recipeId}${extension}`;
    // Write to a temp file first so a partial download is never served.
    const tempPath = path.join(IMAGE_DIR, `.${fileName}.tmp`);
    fs.writeFileSync(tempPath, buffer);
    fs.renameSync(tempPath, path.join(IMAGE_DIR, fileName));

    return `${IMAGE_ROUTE}/${fileName}`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to store image for recipe ${recipeId}: ${reason}`);
    return null;
  }
}
