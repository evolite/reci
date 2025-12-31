import * as cheerio from 'cheerio';
import { findCommentsInObject } from './youtubeServiceHelpers';

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
    const match = pattern.exec(url);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

// Helper function to extract metadata from HTML
function extractMetadataFromHtml(html: string, $: cheerio.CheerioAPI, videoId: string): { title: string; description: string; thumbnailUrl: string } {
  // Extract title - try multiple sources
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const metaTitle = $('meta[name="title"]').attr('content')?.trim();
  const pageTitle = $('title').first().text().replace(/\s*-\s*YouTube\s*$/, '').trim();
  let title = ogTitle || metaTitle || pageTitle || 'Untitled';

  // Extract description - try multiple sources
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim();
  let description = ogDescription || metaDescription || '';

  // Extract thumbnail - try multiple sources
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
  const ogImageSecure = $('meta[property="og:image:secure_url"]').attr('content')?.trim();
  let thumbnailUrl = ogImage || ogImageSecure || '';

  // Fallback: try to extract from JSON-LD or embedded data
  if (!title || title === 'Untitled') {
    const titleRegexes = [
      /"title"\s*:\s*"([^"]+)"/,
      /"name"\s*:\s*"([^"]+)"/,
      /<title[^>]*>([^<]+)<\/title>/i,
    ];
    
    for (const regex of titleRegexes) {
      const match = regex.exec(html);
      if (match?.[1] && !match[1].includes('YouTube')) {
        title = match[1].trim();
        break;
      }
    }
  }

  if (!description) {
    const descRegexes = [
      /"description"\s*:\s*"([^"]+)"/,
      /"shortDescription"\s*:\s*"([^"]+)"/,
    ];
    
    for (const regex of descRegexes) {
      const match = regex.exec(html);
      if (match?.[1]) {
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
    // Use a more specific pattern to avoid catastrophic backtracking
    // Find the start position and then search for the matching closing brace
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
    
    // Fallback to regex if brace counting fails (but with bounded pattern)
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
