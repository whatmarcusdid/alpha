import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertFixJobListItemSanitized,
  listFixSessionsForAdmin,
  mapSessionDocToListItem,
  resolveUserListFields,
} from '@/lib/fix-jobs/list-fix-sessions';
import { resolveSessionStage } from '@/lib/fix-jobs/helpers';

const mockGetAll = vi.fn();
const mockGet = vi.fn();
const queryChain = {
  where: vi.fn(),
  orderBy: vi.fn(),
  startAfter: vi.fn(),
  limit: vi.fn(),
  get: mockGet,
};

queryChain.where.mockReturnValue(queryChain);
queryChain.orderBy.mockReturnValue(queryChain);
queryChain.startAfter.mockReturnValue(queryChain);
queryChain.limit.mockReturnValue(queryChain);

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collectionGroup: vi.fn(() => queryChain),
    collection: vi.fn(() => ({
      doc: vi.fn((id: string) => ({ id })),
    })),
    getAll: (...args: unknown[]) => mockGetAll(...args),
  },
}));

describe('resolveSessionStage', () => {
  it('legacy doc without stage field appears as awaiting_access', () => {
    expect(resolveSessionStage({})).toBe('awaiting_access');
  });
});

describe('mapSessionDocToListItem', () => {
  it('maps legacy session without stage to awaiting_access list item', () => {
    const item = mapSessionDocToListItem(
      'session_1',
      'user_a',
      {
        fixProgress: {
          oversized_images: {
            status: 'pending',
            completedStepIds: [],
            planSource: 'generic',
          },
        },
      },
      {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        company: { websiteUrl: 'https://example.com' },
        siteFix: { entitlements: ['speed'] },
      }
    );

    expect(item.stage).toBe('awaiting_access');
    expect(item.signalsTotal).toBe(1);
    expect(item.signalsDone).toBe(0);
    expect(item.nextAction).toBe('Waiting on customer access');
  });
});

describe('resolveUserListFields', () => {
  it('reads fullName, email, company.websiteUrl, siteFix.entitlements', () => {
    const fields = resolveUserListFields({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      company: { legalName: 'Acme LLC', websiteUrl: 'https://acme.test' },
      siteFix: { entitlements: ['speed', 'security'] },
    });

    expect(fields.customerName).toBe('Jane Doe');
    expect(fields.customerEmail).toBe('jane@example.com');
    expect(fields.siteUrl).toBe('https://acme.test');
    expect(fields.entitlements).toEqual(['speed', 'security']);
  });
});

describe('assertFixJobListItemSanitized', () => {
  it('response payload contains no credential/token/narrative fields', () => {
    const item = assertFixJobListItemSanitized({
      sessionId: 's1',
      uid: 'u1',
      stage: 'ready',
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      siteUrl: 'https://example.com',
      entitlements: ['speed'],
      nextAction: 'Start Phase 0',
      updatedAt: new Date().toISOString(),
      signalsTotal: 2,
      signalsDone: 0,
    });

    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain('credentials');
    expect(serialized).not.toContain('accessToken');
    expect(serialized).not.toContain('grantToken');
    expect(serialized).not.toContain('encryptedCredentials');
    expect(serialized).not.toContain('speedNarrative');
    expect(serialized).not.toContain('securityNarrative');
    expect(serialized).not.toContain('seoNarrative');
    expect(serialized).not.toContain('auditLeadId');
  });
});

describe('listFixSessionsForAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryChain.where.mockReturnValue(queryChain);
    queryChain.orderBy.mockReturnValue(queryChain);
    queryChain.startAfter.mockReturnValue(queryChain);
    queryChain.limit.mockReturnValue(queryChain);
  });

  it('stage=all returns sessions across multiple user subcollections', async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: 'ord_a',
          ref: { parent: { parent: { id: 'user_a' } } },
          data: () => ({
            stage: 'ready',
            updatedAt: { toDate: () => new Date('2026-07-09T12:00:00Z') },
            fixProgress: {},
          }),
        },
        {
          id: 'ord_b',
          ref: { parent: { parent: { id: 'user_b' } } },
          data: () => ({
            stage: 'in_progress',
            updatedAt: { toDate: () => new Date('2026-07-09T11:00:00Z') },
            fixProgress: {
              no_https: {
                status: 'pending',
                completedStepIds: [],
                planSource: 'generic',
              },
            },
          }),
        },
      ],
    });

    mockGetAll.mockResolvedValue([
      {
        id: 'user_a',
        exists: true,
        data: () => ({
          fullName: 'User A',
          email: 'a@test.com',
          company: { websiteUrl: 'https://a.test' },
          siteFix: { entitlements: ['speed'] },
        }),
      },
      {
        id: 'user_b',
        exists: true,
        data: () => ({
          fullName: 'User B',
          email: 'b@test.com',
          company: { websiteUrl: 'https://b.test' },
          siteFix: { entitlements: ['security'] },
        }),
      },
    ]);

    const result = await listFixSessionsForAdmin({ stage: 'all', limit: 50 });

    expect(result.jobs.map((job) => job.uid).sort()).toEqual(['user_a', 'user_b']);
    expect(result.jobs.find((job) => job.uid === 'user_b')?.stage).toBe('in_progress');
  });

  it('stage=ready applies Firestore stage filter', async () => {
    mockGet.mockResolvedValue({ docs: [] });
    mockGetAll.mockResolvedValue([]);

    await listFixSessionsForAdmin({ stage: 'ready', limit: 10 });

    expect(queryChain.where).toHaveBeenCalledWith('stage', '==', 'ready');
  });

  it('pagination returns nextCursor when more results exist', async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: 's1',
          ref: { parent: { parent: { id: 'user_1' } } },
          data: () => ({
            stage: 'ready',
            updatedAt: { toDate: () => new Date('2026-07-09T12:00:00Z') },
            fixProgress: {},
          }),
        },
        {
          id: 's2',
          ref: { parent: { parent: { id: 'user_2' } } },
          data: () => ({
            stage: 'ready',
            updatedAt: { toDate: () => new Date('2026-07-09T11:00:00Z') },
            fixProgress: {},
          }),
        },
        {
          id: 's3',
          ref: { parent: { parent: { id: 'user_3' } } },
          data: () => ({
            stage: 'ready',
            updatedAt: { toDate: () => new Date('2026-07-09T10:00:00Z') },
            fixProgress: {},
          }),
        },
      ],
    });

    mockGetAll.mockResolvedValue([
      {
        id: 'user_1',
        exists: true,
        data: () => ({
          fullName: 'One',
          email: '1@test.com',
          company: { websiteUrl: 'https://1.test' },
          siteFix: { entitlements: ['speed'] },
        }),
      },
      {
        id: 'user_2',
        exists: true,
        data: () => ({
          fullName: 'Two',
          email: '2@test.com',
          company: { websiteUrl: 'https://2.test' },
          siteFix: { entitlements: ['speed'] },
        }),
      },
    ]);

    const result = await listFixSessionsForAdmin({ stage: 'all', limit: 2 });

    expect(result.jobs).toHaveLength(2);
    expect(result.nextCursor).toBe(result.jobs[1]?.updatedAt);
  });
});
