// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength requirements
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
  minLength: MIN_PASSWORD_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
};

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail.length === 0) {
    return { valid: false, error: 'Email cannot be empty' };
  }

  if (normalizedEmail.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return { valid: false, error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long` };
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters (except newlines and tabs for recipe text)
  // Using Unicode escape sequences instead of hex to avoid control character issues
  // Exclude \u0009 (tab) and \u000A (newline) from removal
  const controlCharPattern = /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g;
  let sanitized = input.replace(controlCharPattern, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function validateVideoUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();
  
  if (trimmedUrl.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Validate URL format
  try {
    const urlObj = new URL(trimmedUrl);
    
    // Must be HTTP or HTTPS
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    // URL is valid
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
