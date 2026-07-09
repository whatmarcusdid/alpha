import { describe, expect, it } from 'vitest';

import {
  buildDeliveryConfirmMessage,
  validateLoomUrl,
} from '@/lib/fix-jobs/report-delivery-ui';

describe('report delivery UI helpers', () => {
  it('invalid loomUrl shows inline validation error on blur', () => {
    expect(validateLoomUrl('https://youtube.com/watch?v=abc')).toBe(
      'Must be a https://loom.com URL'
    );
    expect(validateLoomUrl('not-a-url')).toBe('Must be a valid URL');
    expect(validateLoomUrl('')).toBeNull();
    expect(validateLoomUrl('https://loom.com/share/abc')).toBeNull();
  });

  it('confirm dialog shows recipient email, report timestamp, Loom inclusion/exclusion', () => {
    const withLoom = buildDeliveryConfirmMessage({
      recipientEmail: 'customer@example.com',
      generatedAtLabel: 'Today at 9:00 AM',
      loomUrl: 'https://loom.com/share/abc',
    });

    expect(withLoom).toContain('customer@example.com');
    expect(withLoom).toContain('Generated Today at 9:00 AM');
    expect(withLoom).toContain('Loom: https://loom.com/share/abc');
    expect(withLoom).toContain('cannot be undone');

    const withoutLoom = buildDeliveryConfirmMessage({
      recipientEmail: 'customer@example.com',
      generatedAtLabel: 'Today at 9:00 AM',
      loomUrl: '',
    });

    expect(withoutLoom).toContain('Loom: Not included');
  });
});
