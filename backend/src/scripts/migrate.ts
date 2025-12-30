import { execSync } from 'node:child_process';

try {
  console.log('Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('Migrations completed successfully');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
