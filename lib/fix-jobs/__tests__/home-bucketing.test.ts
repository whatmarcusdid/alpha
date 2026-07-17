import { describe, expect, it } from 'vitest';

import {
  computeSessionActiveSummaryCounts,
  getSessionListColumn,
  listEntitlementsToHomeFilter,
  matchesHomeEntitlementFilter,
} from '@/lib/fix-jobs/home-bucketing';
import { mapListItemToAdminHomeJob } from '@/lib/fix-jobs/map-list-item-to-home-job';
import type { FixJobListItem } from '@/lib/types/fix-session';

function makeListItem(overrides: Partial<FixJobListItem> = {}): FixJobListItem {
  return {
    sessionId: 'order-1',
    uid: 'user-1',
    stage: 'ready',
    customerName: 'Bright Path Pressure Washing',
    customerEmail: 'jake@brightpathpw.com',
    siteUrl: 'https://brightpathpw.com',
    entitlements: ['speed', 'security'],
    nextAction: 'Start Phase 0',
    updatedAt: '2026-07-17T12:00:00.000Z',
    signalsTotal: 10,
    signalsDone: 0,
    ...overrides,
  };
}

describe('home-bucketing', () => {
  it('maps session stages to new / active / completed columns', () => {
    expect(getSessionListColumn('awaiting_access')).toBe('new');
    expect(getSessionListColumn('ready')).toBe('active');
    expect(getSessionListColumn('in_progress')).toBe('active');
    expect(getSessionListColumn('qa')).toBe('active');
    expect(getSessionListColumn('report_ready')).toBe('active');
    expect(getSessionListColumn('delivered')).toBe('completed');
  });

  it('computes active summary counts from session stages', () => {
    const jobs = [
      mapListItemToAdminHomeJob(makeListItem({ stage: 'ready' })),
      mapListItemToAdminHomeJob(makeListItem({ sessionId: 'order-2', stage: 'in_progress' })),
      mapListItemToAdminHomeJob(makeListItem({ sessionId: 'order-3', stage: 'qa' })),
      mapListItemToAdminHomeJob(makeListItem({ sessionId: 'order-4', stage: 'report_ready' })),
      mapListItemToAdminHomeJob(makeListItem({ sessionId: 'order-5', stage: 'delivered' })),
    ];

    expect(computeSessionActiveSummaryCounts(jobs)).toEqual({
      readyToStart: 1,
      inProgress: 2,
      reportReady: 1,
    });
  });

  it('maps list entitlements to home filter flags', () => {
    expect(listEntitlementsToHomeFilter(['speed', 'seo_ai_visibility'])).toEqual({
      speed: true,
      security: false,
      seo: true,
    });
  });

  it('filters active jobs by entitlement pillar', () => {
    const speedJob = mapListItemToAdminHomeJob(
      makeListItem({ entitlements: ['speed'], stage: 'in_progress' })
    );
    const securityJob = mapListItemToAdminHomeJob(
      makeListItem({ sessionId: 'order-2', entitlements: ['security'], stage: 'in_progress' })
    );

    expect(matchesHomeEntitlementFilter(speedJob, 'speed')).toBe(true);
    expect(matchesHomeEntitlementFilter(speedJob, 'security')).toBe(false);
    expect(matchesHomeEntitlementFilter(securityJob, 'security')).toBe(true);
  });
});

describe('mapListItemToAdminHomeJob', () => {
  it('maps customer and session fields for home cards', () => {
    const mapped = mapListItemToAdminHomeJob(makeListItem());

    expect(mapped.businessName).toBe('Bright Path Pressure Washing');
    expect(mapped.primaryWebsiteUrl).toBe('https://brightpathpw.com');
    expect(mapped.sessionId).toBe('order-1');
    expect(mapped.uid).toBe('user-1');
    expect(mapped.displayId).toBe('order-1');
    expect(mapped.stage).toBe('ready');
    expect(mapped.entitlements).toEqual({ speed: true, security: true, seo: false });
  });
});
