import * as cheerio from 'cheerio';

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
    } catch {
      // Ignore JSON parse errors
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
      const ytInitialDataMatch = html.match(/var ytInitialData = ({.+?});/s);
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
    comments.push(...findCommentsInArray(obj, depth));
  } else if (obj && typeof obj === 'object') {
    comments.push(...extractCommentFromObject(obj));
    comments.push(...findCommentsInObjectValue(obj, depth + 1));
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
      if (contentType && contentType.includes('application/json')) {
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

export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
  try {
    // Detect platform
    const platform = detectVideoPlatform(url);
    
    // Try oEmbed first for TikTok and Instagram (more reliable)
    let oembedData: { title?: string; description?: string; thumbnailUrl?: string } | null = null;
    if (platform === 'tiktok' || platform === 'instagram') {
      oembedData = await tryOEmbed(url, platform);
    }
    
    // Platform-specific headers and handling
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };
    
    // Add referer for TikTok and Instagram to avoid blocking
    if (platform === 'tiktok' || platform === 'instagram') {
      headers['Referer'] = 'https://www.google.com/';
      headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
    }
    
    // Fetch the webpage with proper headers
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata using Open Graph tags (primary method)
    let { title, description, thumbnailUrl } = extractMetadataFromOpenGraph(html, $);
    
    // Use oEmbed data if available and HTML extraction didn't get good results
    if (oembedData) {
      if (oembedData.title && (!title || title === 'Untitled')) {
        title = oembedData.title;
      }
      if (oembedData.description && !description) {
        description = oembedData.description;
      }
      if (oembedData.thumbnailUrl && !thumbnailUrl) {
        thumbnailUrl = oembedData.thumbnailUrl;
      }
    }

    // Platform-specific extraction for recipe websites
    if (platform && ['delish', 'allrecipes', 'foodnetwork', 'bonappetit', 'seriouseats', 'tasty'].includes(platform)) {
      // Try to extract from JSON-LD structured data (recipe sites often use this)
      const jsonLdScripts = $('script[type="application/ld+json"]');
      jsonLdScripts.each((_, element) => {
        try {
          const jsonContent = $(element).html();
          if (jsonContent) {
            const data = JSON.parse(jsonContent);
            // Handle array of structured data
            const items = Array.isArray(data) ? data : [data];
            
            for (const item of items) {
              // Look for Recipe schema
              if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
                if (item.name && (!title || title === 'Untitled')) {
                  title = item.name;
                }
                if (item.description && !description) {
                  description = item.description;
                }
                if (item.image) {
                  const imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
                  if (typeof imageUrl === 'string' && !thumbnailUrl) {
                    thumbnailUrl = imageUrl;
                  } else if (imageUrl?.url && !thumbnailUrl) {
                    thumbnailUrl = imageUrl.url;
                  }
                }
              }
              // Also check for Article or WebPage with recipe
              if (item['@type'] === 'Article' || item['@type'] === 'WebPage') {
                if (item.headline && (!title || title === 'Untitled')) {
                  title = item.headline;
                }
                if (item.description && !description) {
                  description = item.description;
                }
                if (item.image && !thumbnailUrl) {
                  const imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
                  if (typeof imageUrl === 'string') {
                    thumbnailUrl = imageUrl;
                  } else if (imageUrl?.url) {
                    thumbnailUrl = imageUrl.url;
                  }
                }
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      });
    }
    
    // Platform-specific extraction for TikTok and Instagram
    if (platform === 'tiktok' || platform === 'instagram') {
      // Try to extract from JSON-LD structured data (common in these platforms)
      const jsonLdScripts = $('script[type="application/ld+json"]');
      jsonLdScripts.each((_, element) => {
        try {
          const jsonContent = $(element).html();
          if (jsonContent) {
            const data = JSON.parse(jsonContent);
            // TikTok/Instagram often use @type: "VideoObject"
            if (data['@type'] === 'VideoObject' || data['@type'] === 'Video') {
              if (data.name && (!title || title === 'Untitled')) {
                title = data.name;
              }
              if (data.description && !description) {
                description = data.description;
              }
              if (data.thumbnailUrl && !thumbnailUrl) {
                thumbnailUrl = data.thumbnailUrl;
              }
            }
            // Also check for general metadata
            if (data.headline && (!title || title === 'Untitled')) {
              title = data.headline;
            }
            if (data.description && !description) {
              description = data.description;
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      });
      
      // For Instagram, try additional extraction methods
      if (platform === 'instagram') {
        // Instagram often has metadata in window._sharedData or similar
        const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
        if (sharedDataMatch) {
          try {
            const sharedData = JSON.parse(sharedDataMatch[1]);
            // Navigate through Instagram's data structure
            const entryData = sharedData?.entry_data;
            if (entryData) {
              // Try to find PostPage or ProfilePage data
              const postPage = entryData.PostPage?.[0]?.graphql?.shortcode_media;
              if (postPage) {
                if (postPage.edge_media_to_caption?.edges?.[0]?.node?.text && !description) {
                  description = postPage.edge_media_to_caption.edges[0].node.text;
                }
                if (postPage.display_url && !thumbnailUrl) {
                  thumbnailUrl = postPage.display_url;
                }
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Try Instagram-specific meta tags
        const instagramTitle = $('meta[property="og:title"]').attr('content') || 
                              $('meta[property="al:ios:app_name"]').attr('content') ||
                              $('title').text();
        if (instagramTitle && (!title || title === 'Untitled' || title === 'Instagram')) {
          title = instagramTitle.replace(/\s*-\s*Instagram\s*$/i, '').trim();
        }
        
        // Instagram description is often in og:description
        const instagramDesc = $('meta[property="og:description"]').attr('content');
        if (instagramDesc && !description) {
          description = instagramDesc;
        }
      }
      
      // For TikTok, try to extract from meta tags with specific patterns
      if (platform === 'tiktok') {
        // TikTok sometimes uses different meta tag patterns
        const tiktokTitle = $('meta[property="og:title"]').attr('content') || 
                           $('meta[name="title"]').attr('content') ||
                           $('title').text();
        if (tiktokTitle && (!title || title === 'Untitled')) {
          title = tiktokTitle.replace(/\s*-\s*TikTok\s*$/i, '').trim();
        }
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
