import { describe, expect, it } from 'vitest';

import {
  buildSiteFixLiteralKeyBackfillPlan,
  findSiteFixLiteralTopLevelKeys,
} from '@/lib/book-service/backfill-sitefix-literal-keys';

describe('backfill-sitefix-literal-keys', () => {
  it('finds only top-level keys matching siteFix.*', () => {
    const keys = findSiteFixLiteralTopLevelKeys({
      email: 'a@b.com',
      siteFix: { inviteStatus: 'sent' },
      'siteFix.inviteStatus': 'sent',
      'siteFix.sku': 'speed_fix',
      'not.siteFix.field': 'ignore',
    });

    expect(keys.sort()).toEqual(['siteFix.inviteStatus', 'siteFix.sku']);
  });

  it('builds plan to copy missing nested fields and delete literal keys', () => {
    const plan = buildSiteFixLiteralKeyBackfillPlan('uid-1', {
      siteFix: { contactName: 'API' },
      'siteFix.inviteStatus': 'sent',
      'siteFix.sku': 'speed_fix',
    });

    expect(plan).not.toBeNull();
    expect(plan!.nestedWrites).toEqual({
      'siteFix.inviteStatus': 'sent',
      'siteFix.sku': 'speed_fix',
    });
    expect(plan!.literalDeletes).toEqual(['siteFix.inviteStatus', 'siteFix.sku']);
    expect(plan!.skippedNestedFields).toEqual([]);
    expect(plan!.conflicts).toEqual([]);
  });

  it('is idempotent when nested values already match literal keys', () => {
    const plan = buildSiteFixLiteralKeyBackfillPlan('uid-2', {
      siteFix: { inviteStatus: 'sent', sku: 'speed_fix' },
      'siteFix.inviteStatus': 'sent',
      'siteFix.sku': 'speed_fix',
    });

    expect(plan!.nestedWrites).toEqual({});
    expect(plan!.skippedNestedFields.sort()).toEqual(['inviteStatus', 'sku']);
    expect(plan!.literalDeletes).toEqual(['siteFix.inviteStatus', 'siteFix.sku']);
  });

  it('flags conflicts when nested and literal values differ', () => {
    const plan = buildSiteFixLiteralKeyBackfillPlan('uid-3', {
      siteFix: { inviteStatus: 'accepted' },
      'siteFix.inviteStatus': 'sent',
    });

    expect(plan!.nestedWrites).toEqual({});
    expect(plan!.conflicts).toEqual([
      { field: 'inviteStatus', literalValue: 'sent', nestedValue: 'accepted' },
    ]);
  });

  it('returns null when no literal siteFix.* keys exist', () => {
    expect(
      buildSiteFixLiteralKeyBackfillPlan('uid-4', {
        siteFix: { inviteStatus: 'sent' },
      })
    ).toBeNull();
  });
});
