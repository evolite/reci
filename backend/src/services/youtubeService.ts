import * as cheerio from 'cheerio';

export interface YouTubeVideoMetadata {
  title: string;
  description: string;
  thumbnailUrl: string;
  topComments?: string[];
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Helper function to extract comments from nested object structure
function findCommentsInObject(obj: any, depth = 0): string[] {
  if (depth > 10) return []; // Prevent infinite recursion
  const comments: string[] = [];
  
  if (typeof obj === 'string' && obj.length > 50 && obj.length < 2000) {
    // Check if it looks like a recipe comment
    const recipeKeywords = ['ingredient', 'recipe', 'cook', 'bake', 'mix', 'cup', 'tbsp', 'tsp', 'minute', 'hour', 'step', 'instruction'];
    const lowerText = obj.toLowerCase();
    if (recipeKeywords.some(keyword => lowerText.includes(keyword))) {
      comments.push(obj);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      comments.push(...findCommentsInObject(item, depth + 1));
    }
  } else if (obj && typeof obj === 'object') {
    // Check for comment text in common YouTube data structures
    if (obj.text && typeof obj.text === 'string' && obj.text.length > 50) {
      comments.push(obj.text);
    }
    if (obj.content && typeof obj.content === 'string' && obj.content.length > 50) {
      comments.push(obj.content);
    }
    if (obj.simpleText && typeof obj.simpleText === 'string' && obj.simpleText.length > 50) {
      comments.push(obj.simpleText);
    }
    
    // Recursively search nested objects
    for (const value of Object.values(obj)) {
      comments.push(...findCommentsInObject(value, depth + 1));
    }
  }
  
  return comments;
}

// Helper function to extract metadata from HTML
function extractMetadataFromHtml(html: string, $: cheerio.CheerioAPI, videoId: string): { title: string; description: string; thumbnailUrl: string } {
  // Extract title - try multiple sources
  let title = $('meta[property="og:title"]').attr('content')?.trim() || 
              $('meta[name="title"]').attr('content')?.trim() ||
              $('title').first().text().replace(/\s*-\s*YouTube\s*$/, '').trim() ||
              'Untitled';

  // Extract description - try multiple sources
  let description = $('meta[property="og:description"]').attr('content')?.trim() || 
                   $('meta[name="description"]').attr('content')?.trim() || 
                   '';

  // Extract thumbnail - try multiple sources
  let thumbnailUrl = $('meta[property="og:image"]').attr('content')?.trim() || 
                    $('meta[property="og:image:secure_url"]').attr('content')?.trim() ||
                    '';

  // Fallback: try to extract from JSON-LD or embedded data
  if (!title || title === 'Untitled') {
    const titleMatches = [
      html.match(/"title"\s*:\s*"([^"]+)"/),
      html.match(/"name"\s*:\s*"([^"]+)"/),
      html.match(/<title[^>]*>([^<]+)<\/title>/i),
    ];
    
    for (const match of titleMatches) {
      if (match && match[1] && !match[1].includes('YouTube')) {
        title = match[1].trim();
        break;
      }
    }
  }

  if (!description) {
    const descMatches = [
      html.match(/"description"\s*:\s*"([^"]+)"/),
      html.match(/"shortDescription"\s*:\s*"([^"]+)"/),
    ];
    
    for (const match of descMatches) {
      if (match && match[1]) {
        description = match[1].trim();
        break;
      }
    }
  }

  // Always use YouTube's thumbnail service as fallback
  if (!thumbnailUrl) {
    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  return { title, description, thumbnailUrl };
}

// Helper function to extract comments from HTML
function extractCommentsFromHtml(html: string): string[] {
  const topComments: string[] = [];
  
  try {
    // Try to extract ytInitialData JSON which contains comment data
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
  
  return topComments;
}

export async function getVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Fetch the YouTube page with proper headers
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    const { title, description, thumbnailUrl } = extractMetadataFromHtml(html, $ as any, videoId);

    // Extract comments
    const topComments = extractCommentsFromHtml(html);

    return {
      title,
      description,
      thumbnailUrl,
      topComments: topComments.length > 0 ? topComments : undefined,
    };
  } catch (error) {
    throw new Error(`Failed to fetch video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
