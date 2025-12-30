import { prisma } from '../lib/prisma';

// Helper function to validate invite token
export async function validateInviteToken(inviteToken: string, email: string): Promise<{ valid: boolean; error?: string }> {
  if (!inviteToken) {
    return { valid: false, error: 'Invite token is required' };
  }

  const invite = await prisma.invite.findUnique({
    where: { token: inviteToken },
  });

  if (!invite) {
    return { valid: false, error: 'Invalid invite token' };
  }

  if (invite.usedById) {
    return { valid: false, error: 'Invite token has already been used' };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { valid: false, error: 'Invite token has expired' };
  }

  if (invite.email && invite.email !== email) {
    return { valid: false, error: 'This invite is restricted to a different email address' };
  }

  return { valid: true };
}

// Helper function to check if user is first user
export async function isFirstUser(): Promise<boolean> {
  const userCount = await prisma.user.count();
  return userCount === 0;
}
