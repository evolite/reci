import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  const options: jwt.SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign({ userId }, JWT_SECRET, options);
}

export function verifyToken(token: string): { userId: string } | null {
  if (!JWT_SECRET) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      return decoded as { userId: string };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
