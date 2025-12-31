/**
 * Helper function to extract JSON string using brace counting
 */
export function extractJsonByBraceCounting(html: string, startMarker: string): string | null {
  const startIndex = html.indexOf(startMarker);
  if (startIndex === -1) return null;
  
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
    return html.substring(jsonStart, jsonEnd);
  }
  
  return null;
}

// Helper function to check if a string looks like a recipe comment
function isRecipeComment(text: string): boolean {
  if (text.length < 50 || text.length > 2000) {
    return false;
  }
  const recipeKeywords = ['ingredient', 'recipe', 'cook', 'bake', 'mix', 'cup', 'tbsp', 'tsp', 'minute', 'hour', 'step', 'instruction'];
  const lowerText = text.toLowerCase();
  return recipeKeywords.some(keyword => lowerText.includes(keyword));
}

// Helper function to extract comment text from object properties
function extractCommentFromObject(obj: any): string[] {
  const comments: string[] = [];
  const textFields = ['text', 'content', 'simpleText'];
  
  for (const field of textFields) {
    const value = obj[field];
    if (typeof value === 'string' && isRecipeComment(value)) {
      comments.push(value);
    }
  }
  
  return comments;
}

// Helper function to find comments in arrays
function findCommentsInArray(arr: any[], depth: number): string[] {
  return arr.flatMap(item => findCommentsInObject(item, depth + 1));
}

// Helper function to find comments in objects
function findCommentsInObjectValue(obj: any, depth: number): string[] {
  return Object.values(obj).flatMap(value => findCommentsInObject(value, depth));
}

// Main function to find comments from nested object structure
export function findCommentsInObject(obj: any, depth = 0): string[] {
  if (depth > 10) return []; // Prevent infinite recursion
  
  if (typeof obj === 'string' && isRecipeComment(obj)) {
    return [obj];
  }
  
  if (Array.isArray(obj)) {
    return findCommentsInArray(obj, depth);
  }
  
  if (obj && typeof obj === 'object') {
    return [
      ...extractCommentFromObject(obj),
      ...findCommentsInObjectValue(obj, depth + 1)
    ];
  }
  
  return [];
}
