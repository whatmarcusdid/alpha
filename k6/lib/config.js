/**
 * Shared k6 config — Section 4 load/burst testing (local dev only).
 * Override via env: K6_BASE_URL, K6_ADMIN_TOKEN, K6_FIX_JOB_UID, K6_FIX_JOB_ID
 */
export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';

export const ORDER_STATUS = {
  orderId: __ENV.K6_ORDER_ID || '00000000-0000-0000-0000-k6load000001',
  email: __ENV.K6_ORDER_EMAIL || 'k6-load-probe@bookservice.test',
};

export const ADMIN = {
  token: __ENV.K6_ADMIN_TOKEN || '',
  fixJobUid: __ENV.K6_FIX_JOB_UID || '',
  fixJobId: __ENV.K6_FIX_JOB_ID || '',
};

export const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export function adminHeaders() {
  return {
    ...defaultHeaders,
    Authorization: `Bearer ${ADMIN.token}`,
  };
}
