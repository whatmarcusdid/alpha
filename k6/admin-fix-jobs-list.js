/**
 * Section 4 — GET /api/admin/fix-jobs list (local dev + emulator admin token).
 * 10 VUs × 90s read burst. No route-level rate limiter (admin auth only).
 */
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

import { adminHeaders, BASE_URL } from './lib/config.js';

const status200 = new Counter('admin_200');
const status401 = new Counter('admin_401');
const status403 = new Counter('admin_403');
const status5xx = new Counter('admin_5xx');

export function setup() {
  if (!__ENV.K6_ADMIN_TOKEN) {
    throw new Error(
      'K6_ADMIN_TOKEN missing — run: node k6/scripts/bootstrap-k6-env.mjs'
    );
  }
}

export const options = {
  scenarios: {
    admin_list_burst: {
      executor: 'constant-vus',
      vus: 10,
      duration: '90s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    admin_200: ['count>0'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/admin/fix-jobs?limit=10`, {
    headers: adminHeaders(),
    tags: { name: 'admin-fix-jobs-list' },
  });

  if (res.status === 200) status200.add(1);
  else if (res.status === 401) status401.add(1);
  else if (res.status === 403) status403.add(1);
  else if (res.status >= 500) status5xx.add(1);

  check(res, {
    'admin list 200': (r) => r.status === 200,
    'success payload': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    },
  });

  sleep(0.1);
}

export function handleSummary(data) {
  const m = data.metrics;
  const p95 = m.http_req_duration?.values?.['p(95)'] ?? 0;
  return {
    stdout: [
      '',
      '=== admin-fix-jobs-list k6 summary ===',
      `http_req_duration p(95): ${Math.round(p95)}ms (threshold: <500ms)`,
      `200 count: ${m.admin_200?.values?.count ?? 0}`,
      `401 count: ${m.admin_401?.values?.count ?? 0}`,
      `403 count: ${m.admin_403?.values?.count ?? 0}`,
      `5xx count: ${m.admin_5xx?.values?.count ?? 0}`,
      '',
    ].join('\n'),
  };
}
