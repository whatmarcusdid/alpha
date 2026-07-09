import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixSessionDoc } from '@/lib/types/fix-session';

let sessionDoc: FixSessionDoc;
let userDoc: Record<string, unknown>;
let auditLeadDoc: AuditLeadDoc;
const sessionUpdate = vi.fn();

const sessionRef = {
  get: vi.fn(async () => ({
    exists: true,
    data: () => sessionDoc,
  })),
};

const userRef = {
  get: vi.fn(async () => ({
    exists: true,
    data: () => userDoc,
  })),
};

let txGetCount = 0;

const transactionGet = vi.fn(async () => {
  txGetCount += 1;
  if (txGetCount % 2 === 1) {
    return { exists: true, data: () => sessionDoc };
  }

  return { exists: true, data: () => userDoc };
});

vi.mock('firebase-admin/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase-admin/firestore')>(
    'firebase-admin/firestore'
  );

  return {
    ...actual,
    FieldValue: {
      serverTimestamp: () => ({ __type: 'serverTimestamp' }),
      delete: () => ({ __type: 'delete' }),
    },
  };
});

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    runTransaction: async (
      fn: (tx: {
        get: typeof transactionGet;
        update: typeof sessionUpdate;
      }) => Promise<void>
    ) => fn({ get: transactionGet, update: sessionUpdate }),
    collection: (name: string) => {
      if (name === 'auditLeads') {
        return {
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => auditLeadDoc,
            }),
          }),
        };
      }

      if (name === 'users') {
        return {
          doc: () => ({
            ...userRef,
            collection: () => ({
              doc: () => sessionRef,
            }),
          }),
        };
      }

      return { doc: vi.fn() };
    },
  },
}));

import { patchFixSessionQa } from '@/lib/fix-jobs/patch-fix-session-qa';

function baseSession(overrides: Partial<FixSessionDoc> = {}): FixSessionDoc {
  return {
    stage: 'qa',
    auditLeadId: 'audit_1',
    fixProgress: {
      no_https: {
        status: 'done',
        completedStepIds: ['no_https_1'],
        planSource: 'generic',
        completedAt: Timestamp.fromMillis(1_000),
      },
    },
    afterAudit: {
      capturedAt: Timestamp.fromMillis(2_000),
      security: {
        grade: 'A',
        flags: [],
        flagTier: 'none',
        status: 'completed',
      },
    },
    qa: {
      perPillar: { security: 'not_started' },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  txGetCount = 0;
  sessionDoc = baseSession();
  userDoc = { siteFix: { entitlements: ['security'] } };
  auditLeadDoc = {
    auditLeadId: 'audit_1',
    securityGrade: 'D',
    securityFlags: ['no_https'],
    speedGrade: 'C',
    speedTopIssues: [],
    seoGrade: 'B',
    seoFailingSignals: [],
  } as unknown as AuditLeadDoc;
});

describe('patchFixSessionQa', () => {
  it('set_manual_check: invalid itemId → 400', async () => {
    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'set_manual_check',
        pillar: 'security',
        itemId: 'unknown_item',
        checked: true,
      },
    });

    expect(result).toEqual({ status: 400, error: 'Invalid QA item' });
  });

  it('set_manual_check: auto item kind → 400', async () => {
    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'set_manual_check',
        pillar: 'security',
        itemId: 'snapshot_fresh',
        checked: true,
      },
    });

    expect(result).toEqual({ status: 400, error: 'Invalid QA item' });
  });

  it('set_manual_check: unpurchased pillar → 400', async () => {
    userDoc = { siteFix: { entitlements: ['speed'] } };

    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'set_manual_check',
        pillar: 'security',
        itemId: 'external_scan',
        checked: true,
      },
    });

    expect(result).toEqual({ status: 400, error: 'Pillar not purchased' });
  });

  it('set_manual_check: first check on not_started pillar → perPillar becomes in_progress', async () => {
    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'set_manual_check',
        pillar: 'security',
        itemId: 'external_scan',
        checked: true,
      },
    });

    expect(result).toEqual({
      perPillar: { security: 'in_progress' },
    });
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        'qa.perPillar.security': 'in_progress',
      })
    );
  });

  it('decide pass: unchecked manual item → 409 listing item label', async () => {
    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'passed',
      },
    });

    expect('status' in result && result.status).toBe(409);
    if ('error' in result) {
      expect(result.error).toContain('Fresh external scan reviewed');
    }
  });

  it('decide pass: red auto item + no note → 409', async () => {
    sessionDoc = baseSession({
      qa: {
        perPillar: { security: 'in_progress' },
        manualChecks: {
          security: {
            external_scan: { checked: true, at: Timestamp.now() },
            passwords_rotated: { checked: true, at: Timestamp.now() },
            gsc_review: { checked: true, at: Timestamp.now() },
          },
        },
      },
      afterAudit: {
        capturedAt: Timestamp.fromMillis(500),
        security: {
          grade: 'D',
          flags: ['no_https'],
          flagTier: 'advisory',
          status: 'completed',
        },
      },
    });

    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'passed',
      },
    });

    expect(result).toEqual({
      status: 409,
      error:
        'Override note required: one or more auto-checks are red or unavailable',
    });
  });

  it('decide pass: red auto item + note → 200, overrideNote stored', async () => {
    sessionDoc = baseSession({
      qa: {
        perPillar: { security: 'in_progress' },
        manualChecks: {
          security: {
            external_scan: { checked: true, at: Timestamp.now() },
            passwords_rotated: { checked: true, at: Timestamp.now() },
            gsc_review: { checked: true, at: Timestamp.now() },
          },
        },
      },
      afterAudit: {
        capturedAt: Timestamp.fromMillis(500),
        security: {
          grade: 'D',
          flags: ['no_https'],
          flagTier: 'advisory',
          status: 'completed',
        },
      },
    });

    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'passed',
        note: 'Verified manually in browser',
      },
    });

    expect(result).toEqual({ perPillar: { security: 'passed' } });
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        'qa.decisions.security': expect.objectContaining({
          status: 'passed',
          overrideNote: 'Verified manually in browser',
        }),
      })
    );
  });

  it('decide pass: all green + no note → 200', async () => {
    sessionDoc = baseSession({
      qa: {
        perPillar: { security: 'in_progress' },
        manualChecks: {
          security: {
            external_scan: { checked: true, at: Timestamp.now() },
            passwords_rotated: { checked: true, at: Timestamp.now() },
            gsc_review: { checked: true, at: Timestamp.now() },
          },
        },
      },
    });

    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'passed',
      },
    });

    expect(result).toEqual({ perPillar: { security: 'passed' } });
  });

  it('decide pass: last pillar passes → qa.passedAt set', async () => {
    sessionDoc = baseSession({
      qa: {
        perPillar: { security: 'in_progress' },
        manualChecks: {
          security: {
            external_scan: { checked: true, at: Timestamp.now() },
            passwords_rotated: { checked: true, at: Timestamp.now() },
            gsc_review: { checked: true, at: Timestamp.now() },
          },
        },
      },
    });

    await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'passed',
      },
    });

    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        'qa.passedAt': expect.objectContaining({ __type: 'serverTimestamp' }),
      })
    );
  });

  it('decide fail: no note → 400', async () => {
    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'failed',
      },
    });

    expect(result).toEqual({
      status: 400,
      error: 'A note is required when failing QA',
    });
  });

  it('decide fail: with note → 200, perPillar failed', async () => {
    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'failed',
        note: 'Site still blacklisted',
      },
    });

    expect(result).toEqual({ perPillar: { security: 'failed' } });
  });

  it('decide: outside qa stage → 409', async () => {
    sessionDoc = baseSession({ stage: 'in_progress' });

    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'passed',
        note: 'override',
      },
    });

    expect(result).toEqual({ status: 409, error: 'Job is not in QA stage' });
  });

  it('decide: unpurchased pillar → 400', async () => {
    userDoc = { siteFix: { entitlements: ['speed'] } };

    const result = await patchFixSessionQa({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      action: {
        type: 'decide',
        pillar: 'security',
        status: 'failed',
        note: 'wrong pillar',
      },
    });

    expect(result).toEqual({ status: 400, error: 'Pillar not purchased' });
  });
});
