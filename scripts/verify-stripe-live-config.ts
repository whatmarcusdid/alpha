/**
 * Verifies all 7 Stripe live-mode env vars are present and correctly formatted
 * in a pulled .env file. Never prints full secret values — only prefixes/lengths.
 *
 * Usage:
 *   npx vercel env pull .env.production.check --environment=production
 *   npx tsx scripts/verify-stripe-live-config.ts .env.production.check
 *   rm .env.production.check   // always delete after checking
 */

import { readFileSync, existsSync } from 'fs';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npx tsx scripts/verify-stripe-live-config.ts <path-to-pulled-env-file>');
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

function parseEnvFile(path: string): Record<string, string> {
  const content = readFileSync(path, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const env = parseEnvFile(filePath);

type Check = {
  key: string;
  expectedPrefix: string;
  label: string;
};

const checks: Check[] = [
  { key: 'STRIPE_SECRET_KEY', expectedPrefix: 'sk_live_', label: 'Stripe secret key' },
  {
    key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    expectedPrefix: 'pk_live_',
    label: 'Stripe publishable key',
  },
  { key: 'STRIPE_WEBHOOK_SECRET', expectedPrefix: 'whsec_', label: 'Webhook signing secret' },
  { key: 'STRIPE_PRICE_SPEED_FIX', expectedPrefix: 'price_', label: 'Speed Fix price ID' },
  { key: 'STRIPE_PRICE_SECURITY_FIX', expectedPrefix: 'price_', label: 'Security Fix price ID' },
  { key: 'STRIPE_PRICE_SEO_FIX', expectedPrefix: 'price_', label: 'SEO & AI Visibility price ID' },
  { key: 'STRIPE_PRICE_FULL_BUNDLE', expectedPrefix: 'price_', label: 'Full Bundle price ID' },
];

console.log('Checking Stripe live-mode config...\n');

let allPassed = true;
const rows: { label: string; status: string; detail: string }[] = [];

for (const check of checks) {
  const value = env[check.key];

  if (!value) {
    allPassed = false;
    rows.push({ label: check.label, status: '❌ MISSING', detail: `${check.key} not set` });
    continue;
  }

  const looksTestMode = value.includes('_test_');
  const hasCorrectPrefix = value.startsWith(check.expectedPrefix);

  if (looksTestMode) {
    allPassed = false;
    rows.push({
      label: check.label,
      status: '⚠️  TEST MODE',
      detail: `${check.key} still contains a test-mode value (${value.slice(0, 12)}...)`,
    });
  } else if (!hasCorrectPrefix) {
    allPassed = false;
    rows.push({
      label: check.label,
      status: '❌ WRONG FORMAT',
      detail: `${check.key} doesn't start with "${check.expectedPrefix}" (got: ${value.slice(0, 12)}...)`,
    });
  } else {
    rows.push({
      label: check.label,
      status: '✅ OK',
      detail: `${check.key} = ${value.slice(0, 12)}... (${value.length} chars)`,
    });
  }
}

for (const row of rows) {
  console.log(`${row.status.padEnd(16)} ${row.label}`);
  console.log(`                 ${row.detail}\n`);
}

if (allPassed) {
  console.log('✅ All 7 Stripe live-mode values present and correctly formatted.');
} else {
  console.log('❌ One or more values missing, wrong format, or still test-mode. Fix before testing checkout.');
  process.exit(1);
}
