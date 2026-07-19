/**
 * Section 6 — lighter order-status burst: 8 VUs × 1m (local dev).
 */
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';

import { BASE_URL, ORDER_STATUS } from './lib/config.js';

const status404 = new Counter('status_404');
const status429 = new Counter('status_429');
const status5xx = new Counter('status_5xx');
const orderStatusDuration = new Trend('order_status_duration', true);

export const options = {
  scenarios: {
    order_status_light: {
      executor: 'constant-vus',
      vus: 8,
      duration: '1m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    status_429: ['count>0'],
  },
};

export default function () {
  const url = `${BASE_URL}/api/book-service/order-status?orderId=${encodeURIComponent(ORDER_STATUS.orderId)}&email=${encodeURIComponent(ORDER_STATUS.email)}`;
  const res = http.get(url, { tags: { name: 'order-status' } });
  orderStatusDuration.add(res.timings.duration);
  if (res.status === 404) status404.add(1);
  else if (res.status === 429) status429.add(1);
  else if (res.status >= 500) status5xx.add(1);
  check(res, { 'not 5xx': (r) => r.status < 500 });
  sleep(0.05);
}

export function handleSummary(data) {
  const m = data.metrics;
  return {
    stdout: [
      '',
      '=== order-status-light k6 summary ===',
      `http_req_duration p(95): ${Math.round(m.http_req_duration?.values?.['p(95)'] ?? 0)}ms`,
      `404: ${m.status_404?.values?.count ?? 0}`,
      `429: ${m.status_429?.values?.count ?? 0}`,
      `5xx: ${m.status_5xx?.values?.count ?? 0}`,
      '',
    ].join('\n'),
  };
}
