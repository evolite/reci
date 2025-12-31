import { Response } from 'express';

/**
 * Handles errors in route handlers with consistent error responses
 */
export function handleRouteError(
  error: unknown,
  res: Response,
  context: string,
  defaultMessage: string = 'Internal server error'
): void {
  console.error(`Error ${context}:`, error);
  
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('not found') || error.message.includes('Record to') && error.message.includes('not found')) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    if (error.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    if (error.message.includes('Record to delete does not exist')) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    // Return error message for client errors (400-499)
    if (error.message.includes('required') || 
        error.message.includes('invalid') || 
        error.message.includes('must be')) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: error.message || defaultMessage });
  } else {
    res.status(500).json({ error: defaultMessage });
  }
}

/**
 * Validates that a value is a string
 */
export function validateString(
  value: unknown,
  fieldName: string,
  maxLength?: number,
  minLength: number = 0
): { valid: boolean; error?: string } {
  if (value === undefined) {
    return { valid: true }; // Optional field
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  if (value.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} character(s) long` };
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return { valid: false, error: `${fieldName} must be ${maxLength} characters or less` };
  }
  
  return { valid: true };
}

/**
 * Validates that a value is an array
 */
export function validateArray(
  value: unknown,
  fieldName: string,
  maxLength?: number,
  itemValidator?: (item: unknown, index: number) => { valid: boolean; error?: string }
): { valid: boolean; error?: string } {
  if (value === undefined) {
    return { valid: true }; // Optional field
  }
  
  if (!Array.isArray(value)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return { valid: false, error: `${fieldName} array must have ${maxLength} items or less` };
  }
  
  if (itemValidator) {
    for (let i = 0; i < value.length; i++) {
      const validation = itemValidator(value[i], i);
      if (!validation.valid) {
        return validation;
      }
    }
  }
  
  return { valid: true };
}

/**
 * Extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'Unknown error'): string {
  return error instanceof Error ? error.message : defaultMessage;
}

/**
 * Validates that a value is an array, throws TypeError if not
 */
export function requireArray(value: unknown, fieldName: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array`);
  }
}

/**
 * Filters array to only include non-empty strings
 */
export function filterNonEmptyStrings(items: unknown[]): string[] {
  return items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}
