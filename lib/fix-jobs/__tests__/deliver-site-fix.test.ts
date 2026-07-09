import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FixSessionDoc } from '@/lib/types/fix-session';

const {
  sendSiteFixDeliveryEmail,
  getReportDownloadStream,
  captureException,
  sessionUpdate,
  sessionRefUpdate,
  runTransactionUpdate,
} = vi.hoisted(() => ({
  sendSiteFixDeliveryEmail: vi.fn(),
  getReportDownloadStream: vi.fn(),
  captureException: vi.fn(),
  sessionUpdate: vi.fn(),
  sessionRefUpdate: vi.fn(),
  runTransactionUpdate: vi.fn(),
}));

vi.mock('@/lib/book-service/deliveryEmail', () => ({
  sendSiteFixDeliveryEmail,
}));

vi.mock('@/lib/storage/adminStorage', () => ({
  getReportDownloadStream,
}));

vi.mock('@sentry/nextjs', () => ({
  captureException,
}));

vi.mock('firebase-admin/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase-admin/firestore')>(
    'firebase-admin/firestore'
  );

  return {
    ...actual,
    FieldValue: {
      serverTimestamp: () => ({ __type: 'serverTimestamp' }),
      arrayUnion: (value: unknown) => ({ __type: 'arrayUnion', value }),
    },
  };
});

let sessionDoc: FixSessionDoc;
let userDoc: Record<string, unknown>;

const sessionRef = {
  get: vi.fn(async () => ({
    exists: true,
    data: () => sessionDoc,
  })),
  update: sessionRefUpdate,
};

const userRef = {
  get: vi.fn(async () => ({
    exists: true,
    data: () => userDoc,
  })),
};

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    runTransaction: async (
      fn: (tx: { update: typeof runTransactionUpdate }) => Promise<void>
    ) => {
      await fn({ update: runTransactionUpdate });
    },
    collection: (name: string) => {
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

import {
  buildDeliverableFields,
  deliverSiteFix,
  validateDeliverPreconditions,
} from '@/lib/fix-jobs/deliver-site-fix';

function readySession(overrides: Partial<FixSessionDoc> = {}): FixSessionDoc {
  return {
    stage: 'report_ready',
    report: {
      status: 'generated',
      reportId: 'report_1',
      generatedAt: Timestamp.fromMillis(1_000),
    },
    ...overrides,
  };
}

describe('validateDeliverPreconditions', () => {
  it('stage not report_ready → 409', () => {
    expect(
      validateDeliverPreconditions(readySession({ stage: 'qa' }))
    ).toEqual({
      status: 409,
      error: 'Job is not in report_ready stage',
    });
  });

  it('report.status not_generated → 409 "Generate the report first"', () => {
    expect(
      validateDeliverPreconditions(
        readySession({ report: { status: 'not_generated' } })
      )
    ).toEqual({
      status: 409,
      error: 'Generate the report first',
    });
  });

  it('report.status sent → 409 "Already delivered" (idempotency)', () => {
    expect(
      validateDeliverPreconditions(
        readySession({ report: { status: 'sent', reportId: 'report_1' } })
      )
    ).toEqual({
      status: 409,
      error: 'Already delivered',
    });
  });
});

describe('buildDeliverableFields', () => {
  it('deliverables fields match DeliverablesModule reads (reportUrl, loomUrl, deliveryStatus)', () => {
    expect(buildDeliverableFields('session_1')).toEqual({
      reportUrl: '/api/dashboard/report-download?sessionId=session_1',
      deliveryStatus: 'delivered',
    });

    expect(buildDeliverableFields('session_1', 'https://loom.com/share/abc')).toEqual({
      reportUrl: '/api/dashboard/report-download?sessionId=session_1',
      deliveryStatus: 'delivered',
      loomUrl: 'https://loom.com/share/abc',
    });
  });
});

describe('deliverSiteFix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionDoc = readySession();
    userDoc = {
      email: 'Customer@Example.com',
      fullName: 'Jane Doe',
      company: { legalName: 'Jane Co' },
    };

    getReportDownloadStream.mockResolvedValue(
      (async function* () {
        yield Buffer.from('%PDF-1.4');
      })()
    );
    sendSiteFixDeliveryEmail.mockResolvedValue(undefined);
    sessionRefUpdate.mockResolvedValue(undefined);
    runTransactionUpdate.mockImplementation((_ref, updates) => {
      sessionUpdate(updates);
    });
  });

  it('recipient from user doc, not request body', async () => {
    await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
    });

    expect(sendSiteFixDeliveryEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'customer@example.com',
      })
    );
  });

  it('Loops failure → 500, session remains generated, stage remains report_ready', async () => {
    sendSiteFixDeliveryEmail.mockRejectedValueOnce(new Error('Loops down'));

    const result = await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
    });

    expect(result).toEqual({
      status: 500,
      error: 'Failed to send delivery email',
    });
    expect(runTransactionUpdate).not.toHaveBeenCalled();
    expect(sessionDoc.stage).toBe('report_ready');
    expect(sessionDoc.report?.status).toBe('generated');
  });

  it('Loops failure then retry → succeeds (mock failure-then-success)', async () => {
    sendSiteFixDeliveryEmail
      .mockRejectedValueOnce(new Error('Loops down'))
      .mockResolvedValueOnce(undefined);

    const first = await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
    });
    expect(first).toMatchObject({ status: 500 });

    const second = await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
    });
    expect(second).toHaveProperty('sentAt');
  });

  it('successful deliver: status sent, sentAt set, stage delivered, stageHistory appended', async () => {
    const result = await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      loomUrl: 'https://loom.com/share/walkthrough',
    });

    expect(result).toHaveProperty('sentAt');
    expect(sessionRefUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryAttemptAt: expect.objectContaining({ __type: 'serverTimestamp' }),
      })
    );
    expect(runTransactionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        'report.status': 'sent',
        'report.sentAt': expect.any(Timestamp),
        stage: 'delivered',
        stageHistory: expect.objectContaining({
          __type: 'arrayUnion',
          value: expect.objectContaining({
            stage: 'delivered',
            by: 'admin_1',
          }),
        }),
        reportUrl: '/api/dashboard/report-download?sessionId=session_1',
        deliveryStatus: 'delivered',
        loomUrl: 'https://loom.com/share/walkthrough',
      })
    );
  });

  it('marks delivery attempt before Loops send', async () => {
    const callOrder: string[] = [];
    sessionRefUpdate.mockImplementation(async () => {
      callOrder.push('markAttempt');
    });
    sendSiteFixDeliveryEmail.mockImplementation(async () => {
      callOrder.push('loops');
    });
    runTransactionUpdate.mockImplementation(async () => {
      callOrder.push('firestore');
    });

    await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
    });

    expect(callOrder).toEqual(['markAttempt', 'loops', 'firestore']);
  });

  it('Firestore write failure after send logs Sentry and returns warning', async () => {
    runTransactionUpdate.mockRejectedValueOnce(new Error('write failed'));

    const result = await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
    });

    expect(sendSiteFixDeliveryEmail).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({
          fixJobId: 'session_1',
          uid: 'user_1',
          reportId: 'report_1',
          context: 'post-delivery-firestore-write',
        }),
      })
    );
    expect(result).toMatchObject({
      warning: 'Email sent but status update failed — check Sentry',
    });
  });
});

describe('after delivery integration (data layer)', () => {
  it('DeliverablesModule source fields populated correctly (reportUrl, loomUrl, deliveryStatus)', () => {
    const fields = buildDeliverableFields('order_abc', 'https://loom.com/share/x');
    expect(fields.reportUrl).toBe('/api/dashboard/report-download?sessionId=order_abc');
    expect(fields.loomUrl).toBe('https://loom.com/share/x');
    expect(fields.deliveryStatus).toBe('delivered');
  });

  it('after delivery: customer download route serves PDF for owning uid', async () => {
    sessionDoc = readySession();
    userDoc = { email: 'jane@example.com', fullName: 'Jane' };

    await deliverSiteFix({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
    });

    const transactionPayload = runTransactionUpdate.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(transactionPayload['report.status']).toBe('sent');
    expect(transactionPayload.reportUrl).toBe(
      '/api/dashboard/report-download?sessionId=session_1'
    );
    expect(getReportDownloadStream).toHaveBeenCalledWith(
      'user_1',
      'session_1',
      'report_1'
    );
  });
});
