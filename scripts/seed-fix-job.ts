/**
 * Seeds a realistic paid Site Fix job for manual end-to-end walkthroughs.
 *
 * Usage:
 *   npm run seed:fix-job
 *   npm run seed:fix-job -- --pillars speed --with-access
 *   npx tsx scripts/seed-fix-job.ts --pillars full --with-access
 *
 * Prerequisites:
 *   - Firebase Admin env vars in .env.local (or FIRESTORE_EMULATOR_HOST for emulator)
 *   - SITE_FIX_ENCRYPTION_KEY when using --with-access
 */

import {
  assertNotProductionProject,
  loadDotEnvFile,
} from '@/lib/fix-jobs/seed-fix-job-utils';

loadDotEnvFile('.env.local');

const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
assertNotProductionProject(projectId);
console.log('✓ Running against:', projectId || '(project id not set)');

async function main(): Promise<void> {
  const { runSeedFixJob } = await import('@/lib/fix-jobs/run-seed-fix-job');
  await runSeedFixJob(process.argv.slice(2));
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
