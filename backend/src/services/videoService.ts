import * as cheerio from 'cheerio';
import { validateVideoUrl } from '../utils/validation';

export interface VideoMetadata {
  title: string;
  description: string;
  thumbnailUrl: string;
  topComments?: string[];
  platform?: string;
}

/**
 * Detects the platform/source from a URL (video platforms or websites)
 */
export function detectVideoPlatform(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Video platforms
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (hostname.includes('instagram.com')) {
      return 'instagram';
    }
    if (hostname.includes('tiktok.com')) {
      return 'tiktok';
    }
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      return 'facebook';
    }
    if (hostname.includes('vimeo.com')) {
      return 'vimeo';
    }
    
    // Recipe/food websites
    if (hostname.includes('delish.com')) {
      return 'delish';
    }
    if (hostname.includes('allrecipes.com')) {
      return 'allrecipes';
    }
    if (hostname.includes('foodnetwork.com')) {
      return 'foodnetwork';
    }
    if (hostname.includes('bonappetit.com')) {
      return 'bonappetit';
    }
    if (hostname.includes('seriouseats.com')) {
      return 'seriouseats';
    }
    if (hostname.includes('tasty.co') || hostname.includes('tasty.com')) {
      return 'tasty';
    }
    
    // Generic website - extract domain name
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      return domainParts[domainParts.length - 2]; // e.g., "delish" from "www.delish.com"
    }
    
    return null; // Unknown platform
  } catch {
    return null;
  }
}

/**
 * Extracts metadata from HTML using Open Graph tags (primary method)
 */
function extractMetadataFromOpenGraph(html: string, $: ReturnType<typeof cheerio.load>): { title: string; description: string; thumbnailUrl: string } {
  // Extract title - try Open Graph first, then standard meta tags
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const metaTitle = $('meta[name="title"]').attr('content')?.trim();
  const pageTitle = $('title').first().text().trim();
  let title = ogTitle || metaTitle || pageTitle || 'Untitled';

  // Extract description - try Open Graph first, then standard meta tags
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim();
  let description = ogDescription || metaDescription || '';

  // Extract thumbnail - try Open Graph first
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
  const ogImageSecure = $('meta[property="og:image:secure_url"]').attr('content')?.trim();
  const twitterImage = $('meta[name="twitter:image"]').attr('content')?.trim();
  let thumbnailUrl = ogImage || ogImageSecure || twitterImage || '';

  // Clean up title - remove platform suffixes
  title = title
    .replace(/\s*-\s*YouTube\s*$/i, '')
    .replace(/\s*-\s*Instagram\s*$/i, '')
    .replace(/\s*-\s*TikTok\s*$/i, '')
    .replace(/\s*\|\s*TikTok\s*$/i, '')
    .trim();

  return { title, description, thumbnailUrl };
}

/**
 * Fallback: Extract metadata from HTML content if meta tags are unavailable
 */
function extractMetadataFromContent(html: string, $: ReturnType<typeof cheerio.load>): { title: string; description: string } {
  let title = 'Untitled';
  let description = '';

  // Try to extract from JSON-LD structured data
  const jsonLdScripts = $('script[type="application/ld+json"]');
  jsonLdScripts.each((_, element) => {
    try {
      const jsonContent = $(element).html();
      if (jsonContent) {
        const data = JSON.parse(jsonContent);
        if (data.name && !title || title === 'Untitled') {
          title = data.name;
        }
        if (data.description && !description) {
          description = data.description;
        }
        if (data.headline && !title || title === 'Untitled') {
          title = data.headline;
        }
      }
    } catch (e) {
      // Ignore JSON parse errors - invalid JSON is not critical
      console.debug('Failed to parse JSON data:', e instanceof Error ? e.message : 'Unknown error');
    }
  });

  // Fallback to page title if still untitled
  if (title === 'Untitled') {
    title = $('title').first().text().trim() || 'Untitled';
  }

  // Try to extract description from common content selectors
  if (!description) {
    const descSelectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      '.description',
      '[class*="description"]',
      'p',
    ];
    
    for (const selector of descSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        description = element.text().trim().substring(0, 500);
        break;
      }
    }
  }

  return { title, description };
}

/**
 * Attempts to extract comments or additional text content (platform-specific)
 * This is a basic implementation - can be extended for specific platforms
 */
function extractCommentsFromHtml(html: string, platform: string | null): string[] {
  const topComments: string[] = [];
  
  // For now, we'll keep YouTube-specific comment extraction
  // Other platforms can be added incrementally
  if (platform === 'youtube') {
    try {
      // Use brace counting instead of regex to avoid catastrophic backtracking
      const startMarker = 'var ytInitialData = ({';
      const startIndex = html.indexOf(startMarker);
      if (startIndex !== -1) {
        // Find the matching closing brace by counting braces
        let braceCount = 0;
        let foundStart = false;
        let jsonStart = -1;
        let jsonEnd = -1;
        
        for (let i = startIndex + startMarker.length - 1; i < Math.min(html.length, startIndex + 1000000); i++) {
          if (html[i] === '{') {
            if (!foundStart) {
              foundStart = true;
              jsonStart = i;
            }
            braceCount++;
          } else if (html[i] === '}') {
            braceCount--;
            if (braceCount === 0 && foundStart) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = html.substring(jsonStart, jsonEnd);
          try {
            const ytInitialData = JSON.parse(jsonStr);
            const comments = findCommentsInObject(ytInitialData);
            
            // Sort by length (longer comments are more likely to contain recipes) and take top 5
            const sortedComments = comments
              .filter((c, i, arr) => arr.indexOf(c) === i) // Remove duplicates
              .sort((a, b) => b.length - a.length)
              .slice(0, 5);
            
            topComments.push(...sortedComments);
          } catch (parseError) {
            console.warn('Failed to parse ytInitialData:', parseError);
          }
        }
      }
      
      // Fallback to bounded regex if brace counting fails
      if (topComments.length === 0) {
        const ytInitialDataRegex = /var ytInitialData = (\{[^;]{0,1000000}\});/s;
        const ytInitialDataMatch = ytInitialDataRegex.exec(html);
        if (ytInitialDataMatch) {
          try {
            const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
            const comments = findCommentsInObject(ytInitialData);
            
            // Sort by length (longer comments are more likely to contain recipes) and take top 5
            const sortedComments = comments
              .filter((c, i, arr) => arr.indexOf(c) === i) // Remove duplicates
              .sort((a, b) => b.length - a.length)
              .slice(0, 5);
            
            topComments.push(...sortedComments);
          } catch (parseError) {
            console.warn('Failed to parse ytInitialData:', parseError);
          }
        }
      }
    } catch (commentError) {
      console.warn('Failed to extract comments:', commentError);
    }
  }
  
  // Future: Add Instagram, TikTok, etc. comment extraction here
  
  return topComments;
}

/**
 * Helper function to check if a string looks like a recipe comment
 */
function isRecipeComment(text: string): boolean {
  if (text.length < 50 || text.length > 2000) {
    return false;
  }
  const recipeKeywords = ['ingredient', 'recipe', 'cook', 'bake', 'mix', 'cup', 'tbsp', 'tsp', 'minute', 'hour', 'step', 'instruction'];
  const lowerText = text.toLowerCase();
  return recipeKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Helper function to extract comment text from object properties
 */
function extractCommentFromObject(obj: any): string[] {
  const comments: string[] = [];
  
  if (obj.text && typeof obj.text === 'string' && isRecipeComment(obj.text)) {
    comments.push(obj.text);
  }
  if (obj.content && typeof obj.content === 'string' && isRecipeComment(obj.content)) {
    comments.push(obj.content);
  }
  if (obj.simpleText && typeof obj.simpleText === 'string' && isRecipeComment(obj.simpleText)) {
    comments.push(obj.simpleText);
  }
  
  return comments;
}

/**
 * Helper function to find comments in arrays
 */
function findCommentsInArray(arr: any[], depth: number): string[] {
  const comments: string[] = [];
  for (const item of arr) {
    comments.push(...findCommentsInObject(item, depth + 1));
  }
  return comments;
}

/**
 * Helper function to find comments in objects
 */
function findCommentsInObjectValue(obj: any, depth: number): string[] {
  const comments: string[] = [];
  for (const value of Object.values(obj)) {
    comments.push(...findCommentsInObject(value, depth));
  }
  return comments;
}

/**
 * Main function to find comments from nested object structure
 */
function findCommentsInObject(obj: any, depth = 0): string[] {
  if (depth > 10) return []; // Prevent infinite recursion
  const comments: string[] = [];
  
  if (typeof obj === 'string' && isRecipeComment(obj)) {
    comments.push(obj);
  } else if (Array.isArray(obj)) {
    const arrayComments = findCommentsInArray(obj, depth);
    comments.push(...arrayComments);
  } else if (obj && typeof obj === 'object') {
    comments.push(
      ...extractCommentFromObject(obj),
      ...findCommentsInObjectValue(obj, depth + 1)
    );
  }
  
  return comments;
}

/**
 * Fetches and extracts metadata from any URL (videos, blog posts, recipe sites, etc.)
 * Uses Open Graph tags as the primary method, with fallbacks for standard meta tags and HTML content
 */
/**
 * Try to fetch metadata via oEmbed API (for platforms that support it)
 */
async function tryOEmbed(videoUrl: string, platform: string | null): Promise<{ title?: string; description?: string; thumbnailUrl?: string } | null> {
  try {
    let oembedUrl: string | null = null;
    
    if (platform === 'tiktok') {
      // TikTok oEmbed endpoint
      oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    } else if (platform === 'instagram') {
      // Instagram oEmbed endpoint - try multiple formats
      // Instagram requires the URL to be in a specific format
      oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    }
    
    if (!oembedUrl) {
      return null;
    }
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      // Check if response is actually JSON
      if (contentType?.includes('application/json')) {
        const data = await response.json() as any;
        return {
          title: data.title || data.author_name,
          description: data.description || data.title,
          thumbnailUrl: data.thumbnail_url || data.thumbnail,
        };
      } else {
        // Instagram oEmbed might return HTML or require authentication
        console.warn(`oEmbed returned non-JSON for ${platform}, content-type: ${contentType}`);
        return null;
      }
    }
  } catch (error) {
    console.warn(`oEmbed fetch failed for ${platform}:`, error);
  }
  
  return null;
}

function buildHeaders(platform: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };
  
  if (platform === 'tiktok' || platform === 'instagram') {
    headers['Referer'] = 'https://www.google.com/';
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
  }
  
  return headers;
}

function mergeOEmbedData(
  oembedData: { title?: string; description?: string; thumbnailUrl?: string } | null,
  title: string,
  description: string,
  thumbnailUrl: string
): { title: string; description: string; thumbnailUrl: string } {
  if (!oembedData) {
    return { title, description, thumbnailUrl };
  }
  
  let mergedTitle = title;
  let mergedDescription = description;
  let mergedThumbnail = thumbnailUrl;
  
  if (oembedData.title && (!title || title === 'Untitled')) {
    mergedTitle = oembedData.title;
  }
  if (oembedData.description && !description) {
    mergedDescription = oembedData.description;
  }
  if (oembedData.thumbnailUrl && !thumbnailUrl) {
    mergedThumbnail = oembedData.thumbnailUrl;
  }
  
  return { title: mergedTitle, description: mergedDescription, thumbnailUrl: mergedThumbnail };
}

function extractImageUrl(image: unknown): string | null {
  if (!image) return null;
  const imageUrl = Array.isArray(image) ? image[0] : image;
  if (typeof imageUrl === 'string') {
    return imageUrl;
  }
  if (imageUrl && typeof imageUrl === 'object' && 'url' in imageUrl) {
    return (imageUrl as { url: string }).url;
  }
  return null;
}

function extractFromJsonLdRecipe(
  $: ReturnType<typeof cheerio.load>,
  title: string,
  description: string,
  thumbnailUrl: string
): { title: string; description: string; thumbnailUrl: string } {
  let result = { title, description, thumbnailUrl };
  const jsonLdScripts = $('script[type="application/ld+json"]');
  
  jsonLdScripts.each((_, element) => {
    try {
      const jsonContent = $(element).html();
      if (!jsonContent) return;
      
      const data = JSON.parse(jsonContent);
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        const itemType = item['@type'];
        const isRecipe = itemType === 'Recipe' || (Array.isArray(itemType) && itemType.includes('Recipe'));
        const isArticleOrWebPage = itemType === 'Article' || itemType === 'WebPage';
        
        if (isRecipe) {
          if (item.name && (!result.title || result.title === 'Untitled')) {
            result.title = item.name;
          }
          if (item.description && !result.description) {
            result.description = item.description;
          }
          const imageUrl = extractImageUrl(item.image);
          if (imageUrl && !result.thumbnailUrl) {
            result.thumbnailUrl = imageUrl;
          }
        }
        
        if (isArticleOrWebPage) {
          if (item.headline && (!result.title || result.title === 'Untitled')) {
            result.title = item.headline;
          }
          if (item.description && !result.description) {
            result.description = item.description;
          }
          const imageUrl = extractImageUrl(item.image);
          if (imageUrl && !result.thumbnailUrl) {
            result.thumbnailUrl = imageUrl;
          }
        }
      }
    } catch (e) {
      console.debug('Failed to parse JSON-LD data:', e instanceof Error ? e.message : 'Unknown error');
    }
  });
  
  return result;
}

function extractFromJsonLdTikTokInstagram(
  $: ReturnType<typeof cheerio.load>,
  title: string,
  description: string,
  thumbnailUrl: string
): { title: string; description: string; thumbnailUrl: string } {
  let result = { title, description, thumbnailUrl };
  const jsonLdScripts = $('script[type="application/ld+json"]');
  
  jsonLdScripts.each((_, element) => {
    try {
      const jsonContent = $(element).html();
      if (!jsonContent) return;
      
      const data = JSON.parse(jsonContent);
      const itemType = data['@type'];
      
      if (itemType === 'VideoObject' || itemType === 'Video') {
        if (data.name && (!result.title || result.title === 'Untitled')) {
          result.title = data.name;
        }
        if (data.description && !result.description) {
          result.description = data.description;
        }
        if (data.thumbnailUrl && !result.thumbnailUrl) {
          result.thumbnailUrl = data.thumbnailUrl;
        }
      }
      
      if (data.headline && (!result.title || result.title === 'Untitled')) {
        result.title = data.headline;
      }
      if (data.description && !result.description) {
        result.description = data.description;
      }
    } catch (e) {
      console.debug('Failed to parse JSON-LD data:', e instanceof Error ? e.message : 'Unknown error');
    }
  });
  
  return result;
}

function extractFromInstagramSharedData(
  html: string,
  description: string,
  thumbnailUrl: string
): { description: string; thumbnailUrl: string } {
  let result = { description, thumbnailUrl };
  // Use brace counting instead of regex to avoid catastrophic backtracking
  const startMarker = 'window._sharedData';
  const startIndex = html.indexOf(startMarker);
  let jsonStr: string | null = null;
  
  if (startIndex !== -1) {
    // Find the assignment and then count braces
    const assignIndex = html.indexOf('=', startIndex);
    if (assignIndex !== -1) {
      // Find the opening brace
      let braceStart = -1;
      for (let i = assignIndex; i < Math.min(html.length, assignIndex + 1000); i++) {
        if (html[i] === '{') {
          braceStart = i;
          break;
        }
      }
      
      if (braceStart !== -1) {
        // Count braces to find the matching closing brace
        let braceCount = 0;
        let jsonEnd = -1;
        
        for (let i = braceStart; i < Math.min(html.length, braceStart + 1000000); i++) {
          if (html[i] === '{') {
            braceCount++;
          } else if (html[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
        
        if (jsonEnd !== -1) {
          jsonStr = html.substring(braceStart, jsonEnd);
        }
      }
    }
  }
  
  // Fallback to bounded regex if brace counting fails
  if (!jsonStr) {
    const sharedDataRegex = /window\._sharedData\s*=\s*(\{[^;]{0,1000000}\});/;
    const sharedDataMatch = sharedDataRegex.exec(html);
    if (sharedDataMatch) {
      jsonStr = sharedDataMatch[1];
    }
  }
  
  if (!jsonStr) {
    return result;
  }
  
  try {
    const sharedData = JSON.parse(jsonStr);
    const entryData = sharedData?.entry_data;
    if (!entryData) {
      return result;
    }
    
    const postPage = entryData.PostPage?.[0]?.graphql?.shortcode_media;
    if (postPage) {
      if (postPage.edge_media_to_caption?.edges?.[0]?.node?.text && !result.description) {
        result.description = postPage.edge_media_to_caption.edges[0].node.text;
      }
      if (postPage.display_url && !result.thumbnailUrl) {
        result.thumbnailUrl = postPage.display_url;
      }
    }
  } catch (e) {
    console.debug('Failed to parse Instagram shared data:', e instanceof Error ? e.message : 'Unknown error');
  }
  
  return result;
}

function extractFromInstagramMetaTags(
  $: ReturnType<typeof cheerio.load>,
  title: string,
  description: string
): { title: string; description: string } {
  let result = { title, description };
  
  const instagramTitle = $('meta[property="og:title"]').attr('content') || 
                        $('meta[property="al:ios:app_name"]').attr('content') ||
                        $('title').text();
  if (instagramTitle && (!result.title || result.title === 'Untitled' || result.title === 'Instagram')) {
    result.title = instagramTitle.replace(/\s*-\s*Instagram\s*$/i, '').trim();
  }
  
  const instagramDesc = $('meta[property="og:description"]').attr('content');
  if (instagramDesc && !result.description) {
    result.description = instagramDesc;
  }
  
  return result;
}

function extractFromTikTokMetaTags(
  $: ReturnType<typeof cheerio.load>,
  title: string
): string {
  const tiktokTitle = $('meta[property="og:title"]').attr('content') || 
                     $('meta[name="title"]').attr('content') ||
                     $('title').text();
  if (tiktokTitle && (!title || title === 'Untitled')) {
    return tiktokTitle.replace(/\s*-\s*TikTok\s*$/i, '').trim();
  }
  return title;
}

export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
  try {
    // Validate URL for SSRF protection
    const validation = validateVideoUrl(url);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid URL');
    }
    
    // Detect platform
    const platform = detectVideoPlatform(url);
    
    // Try oEmbed first for TikTok and Instagram (more reliable)
    let oembedData: { title?: string; description?: string; thumbnailUrl?: string } | null = null;
    if (platform === 'tiktok' || platform === 'instagram') {
      oembedData = await tryOEmbed(url, platform);
    }
    
    // Build headers based on platform
    const headers = buildHeaders(platform);
    
    // Fetch the webpage with proper headers
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata using Open Graph tags (primary method)
    let { title, description, thumbnailUrl } = extractMetadataFromOpenGraph(html, $);
    
    // Merge oEmbed data if available
    ({ title, description, thumbnailUrl } = mergeOEmbedData(oembedData, title, description, thumbnailUrl));

    // Platform-specific extraction for recipe websites
    const recipePlatforms = ['delish', 'allrecipes', 'foodnetwork', 'bonappetit', 'seriouseats', 'tasty'];
    if (platform && recipePlatforms.includes(platform)) {
      ({ title, description, thumbnailUrl } = extractFromJsonLdRecipe($, title, description, thumbnailUrl));
    }
    
    // Platform-specific extraction for TikTok and Instagram
    if (platform === 'tiktok' || platform === 'instagram') {
      ({ title, description, thumbnailUrl } = extractFromJsonLdTikTokInstagram($, title, description, thumbnailUrl));
      
      if (platform === 'instagram') {
        ({ description, thumbnailUrl } = extractFromInstagramSharedData(html, description, thumbnailUrl));
        ({ title, description } = extractFromInstagramMetaTags($, title, description));
      }
      
      if (platform === 'tiktok') {
        title = extractFromTikTokMetaTags($, title);
      }
    }

    // Fallback: If metadata is still missing, try extracting from content
    if (title === 'Untitled' || !description || !thumbnailUrl) {
      const contentMetadata = extractMetadataFromContent(html, $);
      if (title === 'Untitled' && contentMetadata.title) {
        title = contentMetadata.title;
      }
      if (!description && contentMetadata.description) {
        description = contentMetadata.description;
      }
    }
    
    // Log what we extracted for debugging
    console.log(`Extracted metadata for ${platform || 'unknown'} platform:`, {
      title: title.substring(0, 100),
      descriptionLength: description.length,
      hasThumbnail: !!thumbnailUrl,
    });

    // Extract comments (platform-specific, currently only YouTube)
    const topComments = extractCommentsFromHtml(html, platform);

    return {
      title,
      description,
      thumbnailUrl,
      topComments: topComments.length > 0 ? topComments : undefined,
      platform: platform || undefined,
    };
  } catch (error) {
    throw new Error(`Failed to fetch video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
