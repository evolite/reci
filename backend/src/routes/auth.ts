import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, generateToken, generateResetToken } from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isFirstUser } from './authHelpers';
import { validateEmail, validatePassword, normalizeEmail } from '../utils/validation';
import {
  isOidcEnabled,
  createState,
  createPkcePair,
  buildAuthorizationUrl,
  completeAuthorization,
  OidcUserInfo,
} from '../services/oidcService';

const router = Router();

// Short-lived cookie carrying the OIDC state + PKCE verifier across the redirect.
const OIDC_COOKIE = 'reci_oidc_tx';
const OIDC_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function frontendUrl(path: string): string {
  const base = (process.env.APP_URL || 'http://localhost:4001').replace(/\/+$/, '');
  return `${base}${path}`;
}

/**
 * Resolve an authentik identity to a local user.
 * Matches on the subject first, then falls back to email so accounts that
 * already existed before SSO get linked instead of duplicated.
 */
async function resolveOidcUser(info: OidcUserInfo) {
  const bySub = await prisma.user.findUnique({ where: { oidcSub: info.sub } });
  if (bySub) {
    return bySub;
  }

  // Same normalisation as local registration, so omhw@slashdir.net in authentik
  // resolves to the existing local account rather than creating a duplicate.
  const email = normalizeEmail(info.email);

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { oidcSub: info.sub, emailVerified: true },
    });
  }

  // First user to ever sign in becomes admin, matching local registration.
  const firstUser = await isFirstUser();
  return prisma.user.create({
    data: {
      email,
      name: info.name,
      oidcSub: info.sub,
      passwordHash: null,
      emailVerified: true,
      isAdmin: firstUser,
    },
  });
}

// GET /api/auth/config - What the login UI should offer
router.get('/config', (req: Request, res: Response) => {
  res.json({ oidcEnabled: isOidcEnabled() });
});

// GET /api/auth/oidc/login - Kick off the authentik redirect
router.get('/oidc/login', async (req: Request, res: Response) => {
  if (!isOidcEnabled()) {
    return res.status(404).json({ error: 'Single sign-on is not configured' });
  }

  try {
    const state = createState();
    const { verifier, challenge } = createPkcePair();

    res.cookie(OIDC_COOKIE, JSON.stringify({ state, verifier }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: OIDC_COOKIE_MAX_AGE_MS,
      path: '/api/auth/oidc',
    });

    res.redirect(await buildAuthorizationUrl(state, challenge));
  } catch (error) {
    console.error('OIDC login error:', error);
    res.redirect(frontendUrl('/login?error=sso_unavailable'));
  }
});

// GET /api/auth/oidc/callback - Exchange the code and hand a session to the SPA
router.get('/oidc/callback', async (req: Request, res: Response) => {
  if (!isOidcEnabled()) {
    return res.status(404).json({ error: 'Single sign-on is not configured' });
  }

  const clearTransaction = () => res.clearCookie(OIDC_COOKIE, { path: '/api/auth/oidc' });

  try {
    const { code, state } = req.query;
    const raw = readCookie(req, OIDC_COOKIE);
    if (!raw || typeof code !== 'string' || typeof state !== 'string') {
      clearTransaction();
      return res.redirect(frontendUrl('/login?error=sso_failed'));
    }

    const transaction = JSON.parse(raw) as { state: string; verifier: string };
    // Constant-time compare to avoid leaking the state through timing.
    const expected = Buffer.from(transaction.state);
    const received = Buffer.from(state);
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      clearTransaction();
      return res.redirect(frontendUrl('/login?error=sso_state_mismatch'));
    }

    const info = await completeAuthorization(code, transaction.verifier);
    const user = await resolveOidcUser(info);

    clearTransaction();
    // Token goes in the fragment: fragments are not sent to servers or logged.
    res.redirect(`${frontendUrl('/auth/callback')}#token=${encodeURIComponent(generateToken(user.id))}`);
  } catch (error) {
    console.error('OIDC callback error:', error);
    clearTransaction();
    res.redirect(frontendUrl('/login?error=sso_failed'));
  }
});

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
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
        ? Math.ceil((Number(lockout.lockedUntil) - Date.now()) / 60000)
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

    // Accounts provisioned through authentik have no local password.
    if (!user.passwordHash) {
      recordFailedLoginAttempt(normalizedEmail);
      return res.status(401).json({ error: 'This account signs in through authentik' });
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

    if (user.emailVerificationTokenExpires && user.emailVerificationTokenExpires < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
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

    // Email delivery is not yet configured. The reset token is persisted in the
    // database; integrate an email provider (e.g. Resend, SendGrid) here to
    // deliver the link to the user.

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

export default router;
