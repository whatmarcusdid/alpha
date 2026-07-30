/**
 * Verifies Site Fix Stripe price IDs against the live Stripe API.
 *
 * Usage:
 *   npx vercel env pull .env.production.check --environment=production
 *   npx tsx scripts/verify-stripe-live-prices.ts .env.production.check
 *   rm .env.production.check
 */

import { existsSync, readFileSync } from 'fs';

import Stripe from 'stripe';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npx tsx scripts/verify-stripe-live-prices.ts <path-to-pulled-env-file>');
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

type PriceCheck = {
  envKey: string;
  label: string;
  expectedUnitAmountCents: number | null;
};

const PRICE_CHECKS: PriceCheck[] = [
  {
    envKey: 'STRIPE_PRICE_SPEED_FIX',
    label: 'Speed Fix',
    expectedUnitAmountCents: 79900,
  },
  {
    envKey: 'STRIPE_PRICE_SECURITY_FIX',
    label: 'Security Fix',
    expectedUnitAmountCents: 99900,
  },
  {
    envKey: 'STRIPE_PRICE_SEO_FIX',
    label: 'SEO & AI Visibility Fix',
    expectedUnitAmountCents: 67900,
  },
  {
    envKey: 'STRIPE_PRICE_FULL_BUNDLE',
    label: 'Full Bundle',
    expectedUnitAmountCents: null,
  },
];

function formatAmount(unitAmountCents: number | null, currency: string): string {
  if (unitAmountCents === null) {
    return 'n/a';
  }

  const dollars = unitAmountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(dollars);
}

function getProductName(price: Stripe.Price): string {
  const product = price.product;

  if (typeof product === 'object' && product !== null && 'name' in product && !product.deleted) {
    return product.name ?? '(unnamed product)';
  }

  if (typeof product === 'string') {
    return product;
  }

  return '(unknown product)';
}

const env = parseEnvFile(filePath);
const secretKey = env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is not set in the env file.');
  process.exit(1);
}

if (!secretKey.startsWith('sk_live_')) {
  console.error('Refusing to run: STRIPE_SECRET_KEY must start with sk_live_.');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

async function verifyPrices(): Promise<void> {
  console.log('Verifying Site Fix Stripe prices against live API...\n');

  let allPassed = true;

  for (const check of PRICE_CHECKS) {
    const priceId = env[check.envKey];

    if (!priceId) {
      allPassed = false;
      console.log(`❌ ${check.label} (${check.envKey})`);
      console.log(`   Reason: ${check.envKey} is not set\n`);
      continue;
    }

    if (!priceId.startsWith('price_')) {
      allPassed = false;
      console.log(`❌ ${check.label} (${check.envKey})`);
      console.log(`   Reason: ${check.envKey} is not a valid price ID (expected price_..., got ${priceId.slice(0, 12)}...)\n`);
      continue;
    }

    let price: Stripe.Price;

    try {
      price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    } catch (error) {
      allPassed = false;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${check.label} (${check.envKey})`);
      console.log(`   Reason: Stripe API error for ${priceId}: ${message}\n`);
      continue;
    }

    const failures: string[] = [];

    if (!price.livemode) {
      failures.push('price.livemode is false (test-mode price)');
    }

    if (!price.active) {
      failures.push('price.active is false (inactive price)');
    }

    if (check.expectedUnitAmountCents !== null) {
      if (price.unit_amount === null) {
        failures.push('price.unit_amount is null (expected a fixed amount)');
      } else if (price.unit_amount !== check.expectedUnitAmountCents) {
        failures.push(
          `price.unit_amount is ${formatAmount(price.unit_amount, price.currency)} ` +
            `(expected ${formatAmount(check.expectedUnitAmountCents, price.currency)})`
        );
      }
    }

    if (failures.length > 0) {
      allPassed = false;
      console.log(`❌ ${check.label} (${check.envKey})`);
      for (const failure of failures) {
        console.log(`   Reason: ${failure}`);
      }
      console.log('');
      continue;
    }

    console.log(`✅ ${check.label} (${check.envKey})`);
    console.log(`   Product:  ${getProductName(price)}`);
    console.log(`   Amount:   ${formatAmount(price.unit_amount, price.currency)}`);
    console.log(`   Currency: ${price.currency.toUpperCase()}`);
    console.log(`   Livemode: ${price.livemode}`);
    console.log(`   Active:   ${price.active}`);
    console.log('');
  }

  if (allPassed) {
    console.log('✅ All Site Fix Stripe prices verified against live Stripe.');
    process.exit(0);
  }

  console.log('❌ One or more Site Fix Stripe prices failed verification.');
  process.exit(1);
}

verifyPrices().catch((error) => {
  console.error('Failed to verify Stripe prices:', error);
  process.exit(1);
});
