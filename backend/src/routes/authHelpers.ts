import { prisma } from '../lib/prisma';

// Helper function to check if user is first user
export async function isFirstUser(): Promise<boolean> {
  const userCount = await prisma.user.count();
  return userCount === 0;
}
