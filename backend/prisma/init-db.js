/**
 * Run seed only if the database is empty (first start).
 * Prevents overwriting real data on container restarts.
 */
import prismaPkg from '@prisma/client';
import { execSync } from 'child_process';

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

try {
  const count = await prisma.user.count();
  if (count < 2) {
    console.log('[init-db] Empty database, running seed...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
  } else {
    console.log(`[init-db] Database has ${count} users, skipping seed.`);
  }
} catch (e) {
  console.error('[init-db] Error:', e.message);
} finally {
  await prisma.$disconnect();
}
