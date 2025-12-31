import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, generateToken, generateVerificationToken, generateResetToken } from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateInviteToken, isFirstUser } from './authHelpers';
import { validateEmail, validatePassword, normalizeEmail } from '../utils/validation';

const router = Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Account lockout tracking (in-memory, consider moving to Redis in production)
interface LockoutInfo {
  attempts: number;
  lockedUntil: Date | null;
}

const accountLockouts = new Map<string, LockoutInfo>();

function isAccountLocked(email: string): boolean {
  const lockout = accountLockouts.get(email);
  if (!lockout) return false;
  
  if (lockout.lockedUntil && lockout.lockedUntil > new Date()) {
    return true;
  }
  
  // Clear expired lockout
  if (lockout.lockedUntil && lockout.lockedUntil <= new Date()) {
    accountLockouts.delete(email);
  }
  
  return false;
}

function recordFailedLoginAttempt(email: string): void {
  const lockout = accountLockouts.get(email) || { attempts: 0, lockedUntil: null };
  lockout.attempts += 1;
  
  if (lockout.attempts >= 5) {
    const lockoutUntil = new Date();
    lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 15); // Lock for 15 minutes
    lockout.lockedUntil = lockoutUntil;
  }
  
  accountLockouts.set(email, lockout);
}

function clearLoginAttempts(email: string): void {
  accountLockouts.delete(email);
}

// POST /api/auth/register - Register new user (requires valid invite token, first user becomes admin)
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name, inviteToken } = req.body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if this is the first user (no invite needed)
    const firstUser = await isFirstUser();
    let invite = null;
    
    if (!firstUser) {
      // Not first user - validate invite token
      const validation = await validateInviteToken(inviteToken || '', normalizedEmail);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Get the invite for later use
      invite = await prisma.invite.findUnique({
        where: { token: inviteToken },
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // First user becomes admin
    const isAdmin = firstUser;

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name ? name.trim().substring(0, 100) : null, // Sanitize name
        isAdmin,
        emailVerificationToken: generateVerificationToken(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        emailVerified: true,
      },
    });

    // Mark invite as used (if not first user)
    if (invite) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: {
          usedById: user.id,
          usedAt: new Date(),
        },
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login - Login (verify credentials, return token)
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if account is locked
    if (isAccountLocked(normalizedEmail)) {
      const lockout = accountLockouts.get(normalizedEmail);
      const minutesRemaining = lockout?.lockedUntil 
        ? Math.ceil((lockout.lockedUntil.getTime() - new Date().getTime()) / 60000)
        : 15;
      return res.status(423).json({ 
        error: `Account locked due to too many failed attempts. Please try again in ${minutesRemaining} minute(s).` 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      recordFailedLoginAttempt(normalizedEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      recordFailedLoginAttempt(normalizedEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Clear failed attempts on successful login
    clearLoginAttempts(normalizedEmail);

    // Generate JWT token
    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  // Logout is handled client-side by removing the token
  // This endpoint exists for consistency
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current user info (protected)
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({
    user: req.user,
  });
});

// POST /api/auth/verify-email - Verify email with token
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// POST /api/auth/forgot-password - Request password reset (generate token, store in DB)
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If an account exists, a password reset link has been sent' });
    }

    const resetToken = generateResetToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiration

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // TODO: Send email with reset token
    // For now, just return success (token stored in DB)

    res.json({ message: 'If an account exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Use transaction to ensure atomic token invalidation
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date(), // Token not expired
          },
        },
      });

      if (!user) {
        return null;
      }

      const passwordHash = await hashPassword(newPassword);

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      return user;
    });

    if (!result) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/check-invite/:token - Check if invite token is valid (public, for signup page)
router.get('/check-invite/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        createdBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite token' });
    }

    if (invite.usedById) {
      return res.status(400).json({ error: 'Invite token has already been used' });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invite token has expired' });
    }

    res.json({
      valid: true,
      email: invite.email,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error('Check invite error:', error);
    res.status(500).json({ error: 'Failed to check invite token' });
  }
});

export default router;
