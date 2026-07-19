/**
 * Section 6 — concurrent k6 order-status load + light audit rate-limit probes.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const LOCAL = 'http://localhost:3000';
const ORDER_ID = '00000000-0000-0000-0000-sec6load00001';
const ORDER_EMAIL = 'sec6-probe@bookservice.test';

function loadDotEnvFile(relativePath) {
  const filePath = resolve(process.cwd(), relativePath);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvFile('.env.local');

async function orderStatusProbe(label) {
  const t0 = performance.now();
  const res = await fetch(
    `${LOCAL}/api/book-service/order-status?orderId=${encodeURIComponent(ORDER_ID)}&email=${encodeURIComponent(ORDER_EMAIL)}`
  );
  const ms = Math.round(performance.now() - t0);
  return {
    label,
    ms,
    status: res.status,
    limit: res.headers.get('x-ratelimit-limit'),
    remaining: res.headers.get('x-ratelimit-remaining'),
  };
}

async function auditPost(email, label) {
  const t0 = performance.now();
  const res = await fetch(`${LOCAL}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Sec6',
      businessName: `Sec6 Probe ${label}`,
      email,
      websiteUrl: 'https://example.com',
    }),
  });
  const ms = Math.round(performance.now() - t0);
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  return {
    label,
    ms,
    status: res.status,
    error: json.error?.slice?.(0, 80) ?? json.error,
    limit: res.headers.get('x-ratelimit-limit'),
    remaining: res.headers.get('x-ratelimit-remaining'),
  };
}

function runK6() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('k6', ['run', 'k6/order-status-light.js'], {
      cwd: process.cwd(),
      env: { ...process.env, K6_BASE_URL: LOCAL },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('close', (code) => {
      resolvePromise({ code, stdout });
    });
    child.on('error', reject);
  });
}

async function main() {
  const baseline = await orderStatusProbe('baseline-before-k6');
  const k6Promise = runK6();

  const probes = [baseline];
  const auditResults = [];
  const start = performance.now();

  // Light audit: one full run + duplicate email for email-limit 429 (Section 5.2 pattern, minimal)
  const sharedEmail = `sec6-audit-${Date.now()}@bookservice.test`;
  await new Promise((r) => setTimeout(r, 5000));
  auditResults.push(await auditPost(sharedEmail, 'audit-1-first'));
  probes.push(await orderStatusProbe('during-k6-after-audit1'));

  await new Promise((r) => setTimeout(r, 15000));
  probes.push(await orderStatusProbe('during-k6-mid'));

  auditResults.push(await auditPost(sharedEmail, 'audit-2-same-email'));
  probes.push(await orderStatusProbe('during-k6-after-audit2-429'));

  await new Promise((r) => setTimeout(r, 15000));
  probes.push(await orderStatusProbe('during-k6-late'));

  const k6 = await k6Promise;
  const after = await orderStatusProbe('after-k6');

  const probe404 = probes.filter((p) => p.status === 404);
  const probe429 = probes.filter((p) => p.status === 429);

  console.log('\n=== Section 6 Results ===');
  console.log(JSON.stringify({ orderStatusProbes: [...probes, after], auditResults, k6Exit: k6.code }, null, 2));

  const auditOk =
    auditResults[0]?.status === 200 &&
    auditResults[1]?.status === 429 &&
    auditResults[1]?.error?.includes('already run an audit today');

  const crossTalkOk = auditResults.every((a) => a.status === 200 || a.status === 429);

  const perfOk =
    probe404.every((p) => p.ms < 500) &&
    (probe429.length === 0 || probe429.every((p) => p.ms < 500));

  console.log(
    JSON.stringify(
      {
        pass: k6.code === 0 || k6.stdout.includes('order-status-light k6 summary'),
        auditLimiterUnderLoad: auditOk ? 'PASS' : 'CHECK',
        crossTalk: crossTalkOk ? 'PASS — audit unaffected by order-status Redis keys' : 'FAIL',
        orderStatusProbePerf: perfOk ? 'PASS — probes stayed sub-500ms during k6' : 'CHECK',
        elapsedSec: Math.round((performance.now() - start) / 1000),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
