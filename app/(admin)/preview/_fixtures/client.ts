import type { FixSession } from '@/components/dashboard/ActiveSiteFixesCard';
import type { FixUpdate } from '@/lib/types/fix-update';
import type { ClientContext } from '@/lib/types/client-context';
import type { ClientDashboardPreviewFixture } from '@/lib/preview/fixtures';

export const CLIENT_FIXTURE_ACTIVE = {
  customerName: 'Marcus',
  businessName: "Smith's Plumbing",
  siteUrl: 'https://smithsplumbing.com',
  activeFix: {
    orderId: 'TSG-4471',
    packageName: 'Speed Fix',
    pillarStatuses: {
      speed: 'in_progress' as const,
    },
    milestones: {
      paid: true,
      accessReceived: true,
      workStarted: true,
      delivered: false,
    },
    updates: [
      {
        id: 'u1',
        message:
          'We compressed and resized your largest images so your pages load faster.',
        createdAt: '2024-06-15T10:15:00.000Z',
        pillar: 'speed' as const,
        visibility: 'client' as const,
        pinned: false,
      },
    ],
  },
  pastAudits: [
    { id: 'a1', date: 'June 12', speedGrade: 'D', securityGrade: 'C', seoGrade: 'D', seoScore: 3 },
  ],
  reviewUrl: null,
};

export const CLIENT_FIXTURE_DELIVERED = {
  ...CLIENT_FIXTURE_ACTIVE,
  activeFix: {
    ...CLIENT_FIXTURE_ACTIVE.activeFix,
    pillarStatuses: { speed: 'done' as const },
    milestones: { paid: true, accessReceived: true, workStarted: true, delivered: true },
    deliverables: {
      reportUrl: '/admin/preview/client/home-delivered#report',
      loomUrl: 'https://www.loom.com/share/preview',
      deliveryStatus: 'delivered' as const,
    },
  },
};

export const CLIENT_FIXTURE_EMPTY = {
  customerName: 'Marcus',
  businessName: "Smith's Plumbing",
  siteUrl: 'https://smithsplumbing.com',
  activeFix: null,
  pastAudits: [] as Array<{
    id: string;
    date: string;
    speedGrade: string;
    securityGrade: string;
    seoGrade: string;
    seoScore: number;
  }>,
  reviewUrl: null,
};

const PREVIEW_USER_ID = 'preview-client-uid-001';

function baseFixSession(overrides: Partial<FixSession> = {}): FixSession {
  return {
    orderId: null,
    accessStatus: null,
    deliveryStatus: null,
    estimatedCompletionAt: null,
    reportUrl: null,
    loomUrl: null,
    googleReviewUrl: null,
    onboarding: null,
    fixProgress: {
      speed: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      security: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      seo: { status: 'queued', description: null, updatedAt: null, completedAt: null },
    },
    ...overrides,
  };
}

function toFixUpdates(
  updates: Array<{
    id: string;
    message: string;
    createdAt: string;
    pillar: FixUpdate['pillar'];
    visibility: 'client';
    pinned: boolean;
  }>
): FixUpdate[] {
  return updates.map((update) => ({
    ...update,
    createdAt: new Date(update.createdAt),
  }));
}

type ClientFixtureWithActiveFix =
  | typeof CLIENT_FIXTURE_ACTIVE
  | typeof CLIENT_FIXTURE_DELIVERED;

function toClientContext(
  fixture: ClientFixtureWithActiveFix | typeof CLIENT_FIXTURE_EMPTY
): ClientContext {
  return {
    userId: PREVIEW_USER_ID,
    fullName: fixture.customerName,
    businessName: fixture.businessName,
    websiteUrl: fixture.siteUrl,
    email: 'marcus@smithsplumbing.com',
    entitlements: fixture.activeFix ? ['speed'] : [],
    packageLabel: fixture.activeFix?.packageName ?? null,
    linkedFixSessionId: fixture.activeFix?.orderId ?? null,
  };
}

export function toClientDashboardFixture(
  fixture: ClientFixtureWithActiveFix
): ClientDashboardPreviewFixture {
  const activeFix = fixture.activeFix;
  const isDelivered = 'deliverables' in activeFix && activeFix.deliverables != null;
  const speedStatus = activeFix.pillarStatuses.speed;

  const fixSession = baseFixSession({
    orderId: activeFix.orderId,
    accessStatus: activeFix.milestones.accessReceived ? 'received' : 'needed',
    deliveryStatus: isDelivered
      ? activeFix.deliverables.deliveryStatus
      : 'in_progress',
    estimatedCompletionAt: new Date('2024-06-17T17:00:00.000Z'),
    reportUrl: isDelivered ? activeFix.deliverables.reportUrl : null,
    loomUrl: isDelivered ? activeFix.deliverables.loomUrl : null,
    googleReviewUrl: fixture.reviewUrl,
    fixProgress: {
      speed: {
        status: speedStatus,
        description:
          speedStatus === 'done'
            ? 'Mobile performance improved from grade F to B.'
            : 'Compressing images and optimizing page load.',
        updatedAt: new Date('2024-06-15T10:15:00.000Z'),
        completedAt: speedStatus === 'done' ? new Date('2024-06-15T15:30:00.000Z') : null,
      },
      security: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      seo: { status: 'queued', description: null, updatedAt: null, completedAt: null },
    },
  });

  return {
    context: toClientContext(fixture),
    fixSession,
    siteFix: {
      orderId: activeFix.orderId,
      onboardingStatus: isDelivered ? 'delivery_ready' : 'delivery_ready',
      inviteStatus: 'accepted',
      purchasedPackages: ['speed'],
      access_request: activeFix.milestones.accessReceived
        ? { status: 'submitted', submittedAt: '2024-06-14T09:00:00.000Z' }
        : undefined,
    },
    fixUpdates: toFixUpdates(activeFix.updates),
  };
}

export function getClientEmptyFixtureContext(): ClientContext {
  return toClientContext(CLIENT_FIXTURE_EMPTY);
}
