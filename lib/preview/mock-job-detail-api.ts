import type { FixJobDetailPayload } from '@/lib/types/fix-session';
import type { HostingContextPayload } from '@/lib/types/hosting-context';
import type { SiteAccessRequestPayload } from '@/lib/types/site-access-request';

export type PreviewJobDetailApiState = {
  detail: FixJobDetailPayload;
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

function matchFixJobPath(pathname: string): { fixJobId: string; suffix: string } | null {
  const match = pathname.match(/^\/api\/admin\/fix-jobs\/([^/]+)(\/.*)?$/);
  if (!match) {
    return null;
  }

  return {
    fixJobId: match[1],
    suffix: match[2] ?? '',
  };
}

export function createPreviewJobDetailApiState(
  detail: FixJobDetailPayload
): PreviewJobDetailApiState {
  return { detail };
}

export function createPreviewJobDetailFetchHandler(
  getState: () => PreviewJobDetailApiState,
  setState: (state: PreviewJobDetailApiState) => void,
  fallbackFetch: typeof fetch
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = parseUrl(input);
    const pathname = url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const matched = matchFixJobPath(pathname);

    if (!matched) {
      return fallbackFetch(input, init);
    }

    const state = getState();
    const { suffix } = matched;
    let body: Record<string, unknown> = {};

    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

    if (suffix === '' && method === 'GET') {
      return jsonResponse({ success: true, data: state.detail });
    }

    if (suffix === '/progress' && method === 'PATCH') {
      const action = body.action as { type?: string; complete?: boolean } | undefined;
      let nextDetail = { ...state.detail };

      if (action?.type === 'set_phase0' && action.complete) {
        nextDetail = { ...nextDetail, phase0Complete: true };
      } else if (body.signalKey && body.completedStepIds) {
        const signalKey = String(body.signalKey);
        const existing = nextDetail.fixProgress[signalKey];
        if (existing) {
          nextDetail = {
            ...nextDetail,
            fixProgress: {
              ...nextDetail.fixProgress,
              [signalKey]: {
                ...existing,
                completedStepIds: body.completedStepIds as string[],
                status: (body.status as typeof existing.status) ?? existing.status,
              },
            },
          };
        }
      }

      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: nextDetail });
    }

    if (suffix === '/stage' && method === 'PATCH') {
      const stage = body.stage as FixJobDetailPayload['stage'] | undefined;
      const nextDetail = stage
        ? { ...state.detail, stage }
        : state.detail;
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: nextDetail });
    }

    if (suffix === '/hosting-context' && method === 'PATCH') {
      const updated: HostingContextPayload = {
        host: String(body.host ?? state.detail.hostingContext.host),
        hostLabel: typeof body.hostLabel === 'string' ? body.hostLabel : state.detail.hostingContext.hostLabel,
        cms: String(body.cms ?? state.detail.hostingContext.cms),
        cmsVersion:
          typeof body.cmsVersion === 'string'
            ? body.cmsVersion
            : state.detail.hostingContext.cmsVersion,
        plugins: Array.isArray(body.plugins)
          ? (body.plugins as string[])
          : state.detail.hostingContext.plugins,
        isConfirmed: true,
        confirmedAt: new Date().toISOString(),
        confirmedBy: 'preview-admin',
      };
      const nextDetail = { ...state.detail, hostingContext: updated };
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: { hostingContext: updated } });
    }

    if (suffix === '/qa' && method === 'PATCH') {
      const qaData = state.detail.qaData ?? {
        perPillar: {},
        manualChecks: {},
        decisions: {},
        passedAt: null,
        autoEvals: null,
      };
      const nextQaData = {
        ...qaData,
        ...(body.perPillar ? { perPillar: body.perPillar as typeof qaData.perPillar } : {}),
        ...(body.manualChecks
          ? { manualChecks: body.manualChecks as typeof qaData.manualChecks }
          : {}),
        ...(body.decisions ? { decisions: body.decisions as typeof qaData.decisions } : {}),
        ...(body.passedAt !== undefined ? { passedAt: body.passedAt as string | null } : {}),
      };
      const nextDetail = {
        ...state.detail,
        qaData: nextQaData,
        qa: {
          perPillar: nextQaData.perPillar,
          ...(nextQaData.passedAt ? { passedAt: nextQaData.passedAt } : {}),
        },
      };
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: nextDetail });
    }

    if (suffix === '/credentials' && method === 'POST') {
      return jsonResponse({
        success: true,
        data: {
          credentials: {
            method: 'wordpress_admin',
            loginUrl: 'https://smithsplumbing.com/wp-admin',
            username: 'preview-admin',
            password: 'preview-password',
            hostingProvider: 'GoDaddy cPanel',
            notes: 'Preview fixture credentials',
          },
        },
      });
    }

    if (suffix === '/updates' && method === 'POST') {
      const message = typeof body.message === 'string' ? body.message : '';
      const pillar = (body.pillar as FixJobDetailPayload['recentUpdates'][number]['pillar']) ?? 'general';
      const update = {
        id: `preview-update-${Date.now()}`,
        message,
        createdAt: new Date().toISOString(),
        pillar,
        visibility: 'client' as const,
        pinned: false,
      };
      const nextDetail = {
        ...state.detail,
        recentUpdates: [update, ...state.detail.recentUpdates],
      };
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: update });
    }

    if (suffix === '/report/generate' && method === 'POST') {
      const reportData = {
        status: 'generated',
        reportId: 'report-preview-001',
        generatedAt: new Date().toISOString(),
        sentAt: null,
        deliveryNote: state.detail.reportData?.deliveryNote ?? null,
        qaOverrideNotes: state.detail.reportData?.qaOverrideNotes ?? {},
        reportUrl: '/admin/preview/delivery-in-progress#report',
        loomUrl: null,
        deliveryStatus: 'in_progress' as const,
      };
      const nextDetail = {
        ...state.detail,
        report: {
          status: 'generated',
          reportId: reportData.reportId,
          generatedAt: reportData.generatedAt,
        },
        reportData,
      };
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: reportData });
    }

    if (suffix === '/deliver' && method === 'POST') {
      const loomUrl =
        typeof body.loomUrl === 'string' && body.loomUrl.length > 0 ? body.loomUrl : null;
      const reportData = {
        status: 'sent',
        reportId: state.detail.reportData?.reportId ?? 'report-preview-001',
        generatedAt: state.detail.reportData?.generatedAt ?? new Date().toISOString(),
        sentAt: new Date().toISOString(),
        deliveryNote:
          typeof body.deliveryNote === 'string'
            ? body.deliveryNote
            : state.detail.reportData?.deliveryNote ?? null,
        qaOverrideNotes: state.detail.reportData?.qaOverrideNotes ?? {},
        reportUrl: state.detail.reportData?.reportUrl ?? '/admin/preview/delivery-complete#report',
        loomUrl,
        deliveryStatus: 'delivered' as const,
      };
      const nextDetail = {
        ...state.detail,
        stage: 'delivered' as const,
        report: {
          status: 'sent',
          reportId: reportData.reportId,
          generatedAt: reportData.generatedAt,
          sentAt: reportData.sentAt,
          deliveryNote: reportData.deliveryNote,
        },
        reportData,
      };
      setState({ detail: nextDetail });
      return jsonResponse({
        success: true,
        data: {
          sentAt: reportData.sentAt,
          loomUrl: reportData.loomUrl,
          reportUrl: reportData.reportUrl,
        },
      });
    }

    if (suffix === '/rerun-checks' && method === 'POST') {
      const afterAudit = state.detail.afterAudit ?? {
        capturedAt: new Date().toISOString(),
        speed: { grade: 'B', score: 78, topIssues: [], status: 'completed' as const },
      };
      const nextDetail = { ...state.detail, afterAudit };
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: { afterAudit } });
    }

    if (suffix === '/site-access-request' && method === 'POST') {
      const request: SiteAccessRequestPayload = {
        requestId: 'preview-access-request-001',
        clientUid: state.detail.uid,
        sessionId: state.detail.sessionId,
        requestedAt: new Date().toISOString(),
        accessType: (body.accessType as SiteAccessRequestPayload['accessType']) ?? 'wp_admin',
        scopeDescription:
          typeof body.scopeDescription === 'string' ? body.scopeDescription : 'Preview access request',
        expiryDays: Number(body.expiryDays ?? 7),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        grantedAt: null,
        revokedAt: null,
      };
      const nextDetail = { ...state.detail, siteAccessRequest: request };
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: request });
    }

    if (suffix === '/site-access-request/revoke' && method === 'POST') {
      const nextDetail = { ...state.detail, siteAccessRequest: null };
      setState({ detail: nextDetail });
      return jsonResponse({ success: true, data: null });
    }

    if (suffix.startsWith('/report/download') && method === 'GET') {
      return new Response('Preview report PDF', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
    }

    return jsonResponse({ success: true, data: state.detail });
  };
}
