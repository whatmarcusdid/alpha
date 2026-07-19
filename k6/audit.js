/**
 * Section 4 — POST /api/audit (local dev, real Upstash + external APIs).
 * Light load only: 1 VU, 2 spaced iterations (~90s apart). Burns real PageSpeed/Gemini quota.
 */
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

import { BASE_URL, defaultHeaders } from './lib/config.js';

const status200 = new Counter('audit_200');
const status429 = new Counter('audit_429');
const status5xx = new Counter('audit_5xx');

export const options = {
  scenarios: {
    spaced_audit: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 2,
      maxDuration: '4m',
    },
  },
  thresholds: {
    // Folder 1 / §4.4 audit ceiling is 60s; typical happy path ~15–25s observed yesterday
    http_req_duration: ['p(95)<60000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const stamp = Date.now();
  const payload = JSON.stringify({
    firstName: 'K6',
    businessName: `K6 Load Probe ${stamp}`,
    email: `k6-audit-${stamp}@bookservice.test`,
    websiteUrl: 'https://example.com',
  });

  const res = http.post(`${BASE_URL}/api/audit`, payload, {
    headers: defaultHeaders,
    tags: { name: 'audit' },
    timeout: '120s',
  });

  if (res.status === 200) status200.add(1);
  else if (res.status === 429) status429.add(1);
  else if (res.status >= 500) status5xx.add(1);

  check(res, {
    'audit not 5xx': (r) => r.status < 500,
    'audit 200 or expected 429': (r) => r.status === 200 || r.status === 429,
  });

  // Space out external API cost between iterations
  sleep(90);
}

export function handleSummary(data) {
  const m = data.metrics;
  const p95 = m.http_req_duration?.values?.['p(95)'] ?? 0;
  return {
    stdout: [
      '',
      '=== audit k6 summary ===',
      `http_req_duration p(95): ${Math.round(p95)}ms (threshold: <60000ms)`,
      `200 count: ${m.audit_200?.values?.count ?? 0}`,
      `429 count: ${m.audit_429?.values?.count ?? 0}`,
      `5xx count: ${m.audit_5xx?.values?.count ?? 0}`,
      '',
    ].join('\n'),
  };
}
