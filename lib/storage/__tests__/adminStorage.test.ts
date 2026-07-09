import { describe, expect, it } from 'vitest';

import { reportStoragePath } from '@/lib/storage/adminStorage';

describe('adminStorage', () => {
  it('uses private reports path without public segments', () => {
    expect(reportStoragePath('user_1', 'session_1', 'report_1')).toBe(
      'reports/user_1/session_1/report_1.pdf'
    );
  });
});
