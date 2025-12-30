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

// Helper function to find comments in arrays
function findCommentsInArray(arr: any[], depth: number): string[] {
  const comments: string[] = [];
  for (const item of arr) {
    comments.push(...findCommentsInObject(item, depth + 1));
  }
  return comments;
}

// Helper function to find comments in objects
function findCommentsInObjectValue(obj: any, depth: number): string[] {
  const comments: string[] = [];
  for (const value of Object.values(obj)) {
    comments.push(...findCommentsInObject(value, depth));
  }
  return comments;
}

// Main function to find comments from nested object structure
export function findCommentsInObject(obj: any, depth = 0): string[] {
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
