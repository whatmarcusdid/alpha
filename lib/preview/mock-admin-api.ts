import { buildReportFilename } from '@/lib/fix-jobs/delivery-helpers';
import type { SerializedFixJob } from '@/lib/fix-jobs/serialize';
import type { SerializedLoopDocV0, SerializedQADoc } from '@/lib/fix-jobs/serialize-loop';
import type { CredentialDisplayRow } from '@/lib/types/delivery';
import {
  buildPreviewCredentials,
  PREVIEW_AUDIT_ID,
  PREVIEW_BUSINESS_NAME,
  PREVIEW_CONTACT_EMAIL,
  PREVIEW_CONTACT_NAME,
  PREVIEW_DISPLAY_ID,
  PREVIEW_ORDER_ID,
  PREVIEW_ORDER_LABEL,
  PREVIEW_USER_ID,
  PREVIEW_WEBSITE_URL,
  serializeAdminFixture,
  type AdminDashboardFixture,
} from '@/lib/preview/fixtures';

export type PreviewAdminApiState = {
  fixture: AdminDashboardFixture;
  job: SerializedFixJob;
  loopDocs: SerializedLoopDocV0[];
  qaDoc: SerializedQADoc | null;
  credentials: CredentialDisplayRow[];
  reportMeta: { filename: string; fileSizeBytes: number } | null;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') {
    return new URL(input, 'http://preview.local');
  }

  if (input instanceof URL) {
    return input;
  }

  return new URL(input.url, 'http://preview.local');
}

const MOCK_CLIENTS = [
  {
    userId: PREVIEW_USER_ID,
    businessName: PREVIEW_BUSINESS_NAME,
    contactName: PREVIEW_CONTACT_NAME,
    websiteUrl: PREVIEW_WEBSITE_URL,
    industry: 'Pressure Washing',
    email: PREVIEW_CONTACT_EMAIL,
  },
];

const MOCK_AUDITS = [
  {
    auditLeadId: PREVIEW_AUDIT_ID,
    displayId: 'AL-0047',
    websiteUrl: PREVIEW_WEBSITE_URL,
    email: PREVIEW_CONTACT_EMAIL,
    businessName: PREVIEW_BUSINESS_NAME,
    timestamp: new Date('2026-06-01T12:00:00.000Z').toISOString(),
  },
];

const MOCK_ORDERS = [
  {
    orderId: PREVIEW_ORDER_ID,
    displayId: 'ORD-0047',
    skuDescription: PREVIEW_ORDER_LABEL,
    amount: 1798,
    normalizedEmail: PREVIEW_CONTACT_EMAIL,
    timestamp: new Date('2026-06-10T09:00:00.000Z').toISOString(),
  },
];

export function createPreviewAdminApiState(fixture: AdminDashboardFixture): PreviewAdminApiState {
  const serialized = serializeAdminFixture(fixture);

  return {
    fixture,
    job: serialized.job,
    loopDocs: serialized.loopDocs,
    qaDoc: serialized.qaDoc,
    credentials: buildPreviewCredentials(fixture.accessRevocations),
    reportMeta: fixture.reportDoc
      ? {
          filename: fixture.reportDoc.filename,
          fileSizeBytes: fixture.reportDoc.fileSizeBytes,
        }
      : null,
  };
}

function countPreviewSteps(state: PreviewAdminApiState): number {
  let count = 0;

  if (state.job.report?.status === 'generated' || state.job.report?.status === 'sent') {
    count += 1;
  }

  if (state.job.delivery?.status === 'sent') {
    count += 1;
  }

  for (const row of state.credentials) {
    if (row.revokedAt) {
      count += 1;
    }
  }

  return count;
}

export function createPreviewAdminFetchHandler(
  getState: () => PreviewAdminApiState,
  setState: (state: PreviewAdminApiState) => void
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = parseUrl(input);
    const pathname = url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const state = getState();
    const fixJobId = state.job.id;

    if (pathname === '/api/admin/users' && method === 'GET') {
      return jsonResponse({ success: true, data: MOCK_CLIENTS });
    }

    if (pathname === '/api/admin/audit-leads' && method === 'GET') {
      return jsonResponse({ success: true, data: MOCK_AUDITS });
    }

    if (pathname === '/api/admin/orders' && method === 'GET') {
      return jsonResponse({ success: true, data: MOCK_ORDERS });
    }

    if (pathname === '/api/admin/reports/generate' && method === 'POST') {
      const filename = buildReportFilename(PREVIEW_DISPLAY_ID, PREVIEW_BUSINESS_NAME);
      const previewUrl = `https://example.com/preview/${filename}`;
      const generatedAt = new Date().toISOString();

      const nextJob: SerializedFixJob = {
        ...state.job,
        report: {
          status: 'generated',
          reportId: 'preview-report-0047',
          generatedAt,
          sentAt: null,
          previewUrl,
        },
      };

      setState({
        ...state,
        job: nextJob,
        reportMeta: { filename, fileSizeBytes: 284_672 },
      });

      return jsonResponse({
        success: true,
        data: {
          reportId: 'preview-report-0047',
          previewUrl,
          filename,
          fileSizeBytes: 284_672,
          generatedAt,
        },
      });
    }

    const deliveryMatch = pathname.match(
      /^\/api\/admin\/fix-jobs\/([^/]+)\/delivery(?:\/(.+))?$/
    );

    if (deliveryMatch?.[1] === fixJobId) {
      const subPath = deliveryMatch[2];

      if (!subPath && method === 'GET') {
        return jsonResponse({
          success: true,
          data: {
            job: state.job,
            credentials: state.credentials,
            revocations: state.credentials
              .filter((row) => row.revokedAt)
              .map((row) => ({
                credentialType: row.credentialType,
                revokedAt: row.revokedAt,
                revokedBy: 'preview-admin',
              })),
            reportMeta: state.reportMeta,
            completedSteps: countPreviewSteps(state),
          },
        });
      }

      if (subPath === 'mark-sent' && method === 'POST') {
        const sentAt = new Date().toISOString();
        const nextJob: SerializedFixJob = {
          ...state.job,
          delivery: { status: 'sent', sentAt, deliveredAt: null },
          report: state.job.report
            ? { ...state.job.report, status: 'sent', sentAt }
            : state.job.report,
        };

        setState({ ...state, job: nextJob });
        return jsonResponse({ success: true, sentAt, data: nextJob });
      }

      if (subPath === 'revoke-access' && method === 'PATCH') {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const credentialType = body.credentialType as CredentialDisplayRow['credentialType'];
        const revokedAt = new Date().toISOString();

        const credentials = state.credentials.map((row) =>
          row.credentialType === credentialType ? { ...row, revokedAt } : row
        );

        setState({ ...state, credentials });
        return jsonResponse({ success: true, revokedAt });
      }

      if (subPath === 'complete' && method === 'POST') {
        const deliveredAt = new Date().toISOString();
        const nextJob: SerializedFixJob = {
          ...state.job,
          stage: 'Delivered',
          status: 'done',
          delivery: {
            status: 'sent',
            sentAt: state.job.delivery?.sentAt ?? deliveredAt,
            deliveredAt,
          },
        };

        setState({ ...state, job: nextJob });
        return jsonResponse({ success: true, data: nextJob });
      }
    }

    const loopsListMatch = pathname.match(/^\/api\/admin\/fix-jobs\/([^/]+)\/loops$/);
    if (loopsListMatch?.[1] === fixJobId && method === 'GET') {
      return jsonResponse({ success: true, data: state.loopDocs });
    }

    const loopPatchMatch = pathname.match(/^\/api\/admin\/fix-jobs\/([^/]+)\/loops\/([^/]+)$/);
    if (loopPatchMatch?.[1] === fixJobId && method === 'PATCH') {
      return jsonResponse({ success: true, data: state.loopDocs[0] ?? null });
    }

    const approvalsMatch = pathname.match(/^\/api\/admin\/fix-jobs\/([^/]+)\/approvals$/);
    if (approvalsMatch?.[1] === fixJobId && method === 'POST') {
      const nextJob: SerializedFixJob = {
        ...state.job,
        stage: 'InProgress',
      };

      setState({
        ...state,
        job: nextJob,
        loopDocs: createPreviewAdminApiState({
          ...state.fixture,
          fixJob: { ...state.fixture.fixJob, stage: 'InProgress' },
          loopDocs: state.fixture.loopDocs ?? {
            security: {
              loopKey: 'security',
              status: 'pending',
              checkedTasks: [],
              phaseCompletion: {
                phase0: false,
                phase1: false,
                phase2: false,
                phase3: false,
                phase4: false,
              },
              completedAt: null,
            },
            speed: {
              loopKey: 'speed',
              status: 'pending',
              checkedTasks: [],
              phaseCompletion: {
                phase0: false,
                phase1: false,
                phase2: false,
                phase3: false,
                phase4: false,
              },
              completedAt: null,
            },
          },
        }).loopDocs,
      });

      return jsonResponse({ success: true, data: nextJob });
    }

    const qaMatch = pathname.match(/^\/api\/admin\/fix-jobs\/([^/]+)\/qa$/);
    if (qaMatch?.[1] === fixJobId) {
      if (method === 'GET') {
        return jsonResponse({ success: true, data: state.qaDoc });
      }

      if (method === 'PATCH' && state.qaDoc) {
        return jsonResponse({ success: true, data: state.qaDoc });
      }
    }

    const fixJobMatch = pathname.match(/^\/api\/admin\/fix-jobs\/([^/]+)$/);
    if (fixJobMatch?.[1] === fixJobId && method === 'PATCH') {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const nextJob: SerializedFixJob = {
        ...state.job,
        ...body,
        triage: body.triage ?? state.job.triage,
        entitlements: body.entitlements ?? state.job.entitlements,
        qa: body.qa ?? state.job.qa,
        report: body.report ?? state.job.report,
        delivery: body.delivery ?? state.job.delivery,
      };

      setState({ ...state, job: nextJob });
      return jsonResponse({ success: true, data: nextJob });
    }

    if (pathname === '/api/admin/fix-jobs' && method === 'GET') {
      return jsonResponse({
        success: true,
        data: {
          jobs: [
            {
              sessionId: state.job.id,
              uid: 'preview-user',
              stage: 'in_progress',
              customerName: state.job.businessName,
              customerEmail: 'preview@example.com',
              siteUrl: state.job.primaryWebsiteUrl,
              entitlements: ['speed'],
              nextAction: '2 of 5 signals remaining',
              updatedAt: new Date().toISOString(),
              signalsTotal: 5,
              signalsDone: 3,
            },
          ],
        },
      });
    }

    return jsonResponse({ error: `Preview mock: unhandled ${method} ${pathname}` }, 404);
  };
}
