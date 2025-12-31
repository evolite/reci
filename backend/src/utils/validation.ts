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

  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
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
  // Exclude \u0009 (tab) and \u000A (newline) from removal
  // Construct regex pattern using character codes to avoid control character detection
  const controlCharPattern = new RegExp(
    '[' +
    String.fromCodePoint(0x0000) + '-' + String.fromCodePoint(0x0008) + // \u0000-\u0008
    String.fromCodePoint(0x000B) + '-' + String.fromCodePoint(0x000C) + // \u000B-\u000C
    String.fromCodePoint(0x000E) + '-' + String.fromCodePoint(0x001F) + // \u000E-\u001F
    String.fromCodePoint(0x007F) + // \u007F
    ']',
    'g'
  );
  let sanitized = input.replaceAll(controlCharPattern, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Checks if an IP address is private/internal (SSRF protection)
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  // 127.0.0.0/8 (localhost)
  // 10.0.0.0/8 (private)
  // 172.16.0.0/12 (private)
  // 192.168.0.0/16 (private)
  // 169.254.0.0/16 (link-local)
  // 0.0.0.0/8 (this network)
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  
  // Check for invalid parts
  if (parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }
  
  // 127.0.0.0/8
  if (parts[0] === 127) return true;
  
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // 169.254.0.0/16 (link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  
  // 0.0.0.0/8
  if (parts[0] === 0) return true;
  
  return false;
}

/**
 * Validates hostname for SSRF protection
 */
function validateHostname(hostname: string): { valid: boolean; error?: string } {
  const lowerHostname = hostname.toLowerCase();
  
  // Block localhost variations
  if (lowerHostname === 'localhost' || 
      lowerHostname.startsWith('localhost.') ||
      lowerHostname.endsWith('.localhost')) {
    return { valid: false, error: 'Localhost URLs are not allowed' };
  }
  
  // Block common internal hostnames
  const blockedHostnames = [
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'localhost',
  ];
  
  if (blockedHostnames.includes(lowerHostname)) {
    return { valid: false, error: 'Internal hostnames are not allowed' };
  }
  
  // Check if hostname is an IP address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    if (isPrivateIP(hostname)) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
  }
  
  // Check for IPv6 localhost
  if (hostname === '::1' || hostname.startsWith('::ffff:127.') || hostname.startsWith('::ffff:10.') ||
      hostname.startsWith('::ffff:192.168.') || hostname.startsWith('::ffff:172.')) {
    return { valid: false, error: 'IPv6 localhost/private addresses are not allowed' };
  }
  
  return { valid: true };
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
  let urlObj: URL;
  try {
    urlObj = new URL(trimmedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  // Must be HTTP or HTTPS (SSRF protection)
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
  }
  
  // Validate hostname for SSRF protection
  const hostnameValidation = validateHostname(urlObj.hostname);
  if (!hostnameValidation.valid) {
    return hostnameValidation;
  }
  
  // URL is valid
  return { valid: true };
}
