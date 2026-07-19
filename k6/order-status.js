/**
 * Section 4 — GET /api/book-service/order-status burst (local dev).
 * 15 VUs × 2m. Expects mostly 404 (dummy order) then 429 at 60/min IP limit.
 */
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

import { BASE_URL, ORDER_STATUS } from './lib/config.js';

const status404 = new Counter('status_404');
const status429 = new Counter('status_429');
const status5xx = new Counter('status_5xx');
const otherStatus = new Counter('status_other');
const rateLimited = new Rate('rate_limit_hit');
const orderStatusDuration = new Trend('order_status_duration', true);

export const options = {
  scenarios: {
    order_status_burst: {
      executor: 'constant-vus',
      vus: 15,
      duration: '2m',
    },
  },
  thresholds: {
    // Doc sample baseline; yesterday's live data: ~165ms avg / sub-500ms p95 locally
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    status_429: ['count>0'],
  },
};

export default function () {
  const url = `${BASE_URL}/api/book-service/order-status?orderId=${encodeURIComponent(ORDER_STATUS.orderId)}&email=${encodeURIComponent(ORDER_STATUS.email)}`;
  const res = http.get(url, { tags: { name: 'order-status' } });

  orderStatusDuration.add(res.timings.duration);

  if (res.status === 404) status404.add(1);
  else if (res.status === 429) {
    status429.add(1);
    rateLimited.add(1);
  } else if (res.status >= 500) {
    status5xx.add(1);
  } else {
    otherStatus.add(1);
  }

  check(res, {
    'not 5xx': (r) => r.status < 500,
    'has body': (r) => r.body && r.body.length > 0,
  });

  sleep(0.05);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const p95 = m.http_req_duration?.values?.['p(95)'] ?? 0;
  const errRate = m.http_req_failed?.values?.rate ?? 0;
  return [
    '',
    '=== order-status k6 summary ===',
    `http_req_duration p(95): ${Math.round(p95)}ms (threshold: <500ms)`,
    `http_req_failed rate: ${(errRate * 100).toFixed(2)}%`,
    `404 count: ${m.status_404?.values?.count ?? 0}`,
    `429 count: ${m.status_429?.values?.count ?? 0}`,
    `5xx count: ${m.status_5xx?.values?.count ?? 0}`,
    `thresholds passed: ${JSON.stringify(data.root_group?.checks ?? {})}`,
    '',
  ].join('\n');
}
