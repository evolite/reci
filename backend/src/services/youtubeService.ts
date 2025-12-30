import * as cheerio from 'cheerio';
import { YouTubeVideoMetadata } from '../models/Recipe';

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#\/]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
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
      // Try to find title in various JSON structures
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
      // Try to find description in JSON structures
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

    // Extract top comments from the page
    const topComments: string[] = [];
    try {
      // Try to extract ytInitialData JSON which contains comment data
      const ytInitialDataMatch = html.match(/var ytInitialData = ({.+?});/s);
      if (ytInitialDataMatch) {
        try {
          const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
          
          // Navigate through the nested structure to find comments
          const findComments = (obj: any, depth = 0): string[] => {
            if (depth > 10) return []; // Prevent infinite recursion
            const comments: string[] = [];
            
            if (typeof obj === 'string' && obj.length > 50 && obj.length < 2000) {
              // Check if it looks like a recipe comment
              const recipeKeywords = ['ingredient', 'recipe', 'cook', 'bake', 'mix', 'cup', 'tbsp', 'tsp', 'minute', 'hour', 'step', 'instruction'];
              const lowerText = obj.toLowerCase();
              if (recipeKeywords.some(keyword => lowerText.includes(keyword))) {
                comments.push(obj);
              }
            }
            
            if (Array.isArray(obj)) {
              for (const item of obj) {
                comments.push(...findComments(item, depth + 1));
              }
            } else if (obj && typeof obj === 'object') {
              // Check for comment text fields
              if (obj.text && typeof obj.text === 'string' && obj.text.length > 50 && obj.text.length < 2000) {
                comments.push(obj.text);
              }
              if (obj.content && typeof obj.content === 'string' && obj.content.length > 50 && obj.content.length < 2000) {
                comments.push(obj.content);
              }
              if (obj.simpleText && typeof obj.simpleText === 'string' && obj.simpleText.length > 50 && obj.simpleText.length < 2000) {
                comments.push(obj.simpleText);
              }
              if (obj.runs && Array.isArray(obj.runs)) {
                const combinedText = obj.runs
                  .map((run: any) => run.text || run.simpleText || '')
                  .filter(Boolean)
                  .join(' ');
                if (combinedText.length > 50 && combinedText.length < 2000) {
                  comments.push(combinedText);
                }
              }
              
              // Recursively search nested objects
              for (const key in obj) {
                if (key !== 'runs' && key !== 'text' && key !== 'content' && key !== 'simpleText') {
                  comments.push(...findComments(obj[key], depth + 1));
                }
              }
            }
            
            return comments;
          };
          
          const foundComments = findComments(ytInitialData);
          // Filter and deduplicate
          const uniqueComments = [...new Set(foundComments)]
            .filter(comment => {
              // Filter out non-recipe-like comments
              const lower = comment.toLowerCase();
              return comment.length > 50 && 
                     !lower.includes('subscribe') && 
                     !lower.includes('like') &&
                     !lower.includes('comment') &&
                     !lower.includes('watch') &&
                     !lower.includes('video');
            })
            .slice(0, 5);
          
          topComments.push(...uniqueComments);
        } catch (parseError) {
          console.warn('Failed to parse ytInitialData:', parseError);
        }
      }

      // Fallback: Try regex patterns for comment extraction
      if (topComments.length === 0) {
        // Pattern 1: commentText with simpleText
        const commentMatches = html.match(/"commentText":\s*\{[^}]*"simpleText":\s*"([^"]+)"/g);
        if (commentMatches) {
          for (let i = 0; i < Math.min(5, commentMatches.length); i++) {
            const textMatch = commentMatches[i].match(/"simpleText":\s*"([^"]+)"/);
            if (textMatch && textMatch[1]) {
              const commentText = textMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                .trim();
              if (commentText.length > 50 && commentText.length < 2000) {
                topComments.push(commentText);
              }
            }
          }
        }

        // Pattern 2: text runs array
        const textRunsPattern = /"runs":\s*\[([^\]]+)\]/g;
        let runsMatch;
        while ((runsMatch = textRunsPattern.exec(html)) !== null && topComments.length < 5) {
          const runsText = runsMatch[1];
          const textMatches = runsText.match(/"text":\s*"([^"]{50,2000})"/g);
          if (textMatches) {
            for (const textMatch of textMatches) {
              const extracted = textMatch.match(/"text":\s*"([^"]+)"/);
              if (extracted && extracted[1]) {
                const commentText = extracted[1]
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                  .trim();
                if (commentText.length > 50 && !topComments.includes(commentText)) {
                  topComments.push(commentText);
                  if (topComments.length >= 5) break;
                }
              }
            }
          }
        }

        // Pattern 3: Generic text pattern for longer comments (likely recipes)
        if (topComments.length < 5) {
          const longTextPattern = /"text":\s*"([^"]{100,2000})"/g;
          let match;
          let count = 0;
          while ((match = longTextPattern.exec(html)) !== null && count < 10) {
            const commentText = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
              .trim();
            // Check if it looks like a recipe
            const lower = commentText.toLowerCase();
            const recipeKeywords = ['ingredient', 'recipe', 'cook', 'bake', 'mix', 'cup', 'tbsp', 'tsp', 'minute', 'hour', 'step', 'instruction', 'add', 'heat', 'stir', 'season'];
            if (commentText.length > 100 && 
                recipeKeywords.some(keyword => lower.includes(keyword)) &&
                !topComments.includes(commentText) &&
                !lower.includes('subscribe') &&
                !lower.includes('like this')) {
              topComments.push(commentText);
              count++;
              if (topComments.length >= 5) break;
            }
          }
        }
      }
    } catch (commentError) {
      // Comments are optional, so we continue even if extraction fails
      console.warn('Failed to extract comments:', commentError);
    }

    return {
      title: title || 'Untitled',
      thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      description: description || '',
      topComments: topComments.length > 0 ? topComments : undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch YouTube video metadata: ${error.message}`);
    }
    throw error;
  }
}
