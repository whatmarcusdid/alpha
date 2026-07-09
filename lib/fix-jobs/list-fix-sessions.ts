import type { Timestamp } from 'firebase-admin/firestore';

import {
  countSignalProgress,
  deriveNextAction,
  resolveSessionStage,
} from '@/lib/fix-jobs/helpers';
import { adminDb } from '@/lib/firebase/admin';
import type { FixPillar } from '@/lib/audit/fixPlaybook';
import type { SiteFixEntitlement } from '@/lib/types/client-context';
import type {
  FixJobListItem,
  FixJobStage,
  FixSessionDoc,
} from '@/lib/types/fix-session';

const VALID_ENTITLEMENTS: SiteFixEntitlement[] = [
  'speed',
  'security',
  'seo_ai_visibility',
];

export type ListFixSessionsParams = {
  stage: FixJobStage | 'all';
  limit: number;
  cursor?: string;
};

export type ListFixSessionsResult = {
  jobs: FixJobListItem[];
  nextCursor?: string;
};

function timestampToIso(value: Timestamp | undefined): string {
  if (!value || typeof value.toDate !== 'function') {
    return new Date(0).toISOString();
  }

  return value.toDate().toISOString();
}

export function parseEntitlementsFromUser(
  siteFix: Record<string, unknown> | undefined
): FixPillar[] {
  if (!siteFix || !Array.isArray(siteFix.entitlements)) {
    return [];
  }

  return siteFix.entitlements.filter(
    (value): value is FixPillar =>
      typeof value === 'string' &&
      VALID_ENTITLEMENTS.includes(value as SiteFixEntitlement)
  );
}

export function resolveUserListFields(userData: Record<string, unknown>): {
  customerName: string;
  customerEmail: string;
  siteUrl: string;
  entitlements: FixPillar[];
} {
  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;

  const siteFix =
    userData.siteFix && typeof userData.siteFix === 'object'
      ? (userData.siteFix as Record<string, unknown>)
      : undefined;

  const customerName =
    typeof userData.fullName === 'string' && userData.fullName.trim().length > 0
      ? userData.fullName.trim()
      : typeof company?.legalName === 'string' && company.legalName.trim().length > 0
        ? company.legalName.trim()
        : 'Unknown customer';

  const customerEmail =
    typeof userData.email === 'string' ? userData.email.trim() : '';

  const siteUrl =
    typeof company?.websiteUrl === 'string' ? company.websiteUrl.trim() : '';

  return {
    customerName,
    customerEmail,
    siteUrl,
    entitlements: parseEntitlementsFromUser(siteFix),
  };
}

export function mapSessionDocToListItem(
  sessionId: string,
  uid: string,
  sessionData: FixSessionDoc,
  userData: Record<string, unknown> | undefined
): FixJobListItem {
  const stage = resolveSessionStage(sessionData);
  const { total, done } = countSignalProgress(sessionData.fixProgress);
  const userFields = resolveUserListFields(userData ?? {});

  return {
    sessionId,
    uid,
    stage,
    customerName: userFields.customerName,
    customerEmail: userFields.customerEmail,
    siteUrl: userFields.siteUrl,
    entitlements: userFields.entitlements,
    nextAction: deriveNextAction(stage, total, done),
    updatedAt: timestampToIso(sessionData.updatedAt),
    signalsTotal: total,
    signalsDone: done,
  };
}

function matchesStageFilter(
  sessionData: FixSessionDoc,
  stage: FixJobStage | 'all'
): boolean {
  if (stage === 'all') {
    return true;
  }

  const resolved = resolveSessionStage(sessionData);
  return resolved === stage;
}

export async function listFixSessionsForAdmin(
  params: ListFixSessionsParams
): Promise<ListFixSessionsResult> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const { stage, limit, cursor } = params;
  const needsPostFilter = stage === 'awaiting_access';
  const fetchSize = needsPostFilter ? Math.min((limit + 1) * 5, 500) : limit + 1;

  let query = adminDb.collectionGroup('fixSessions').orderBy('updatedAt', 'desc');

  if (stage !== 'all' && !needsPostFilter) {
    query = query.where('stage', '==', stage);
  }

  if (cursor) {
    query = query.startAfter(new Date(cursor));
  }

  query = query.limit(fetchSize);

  const snapshot = await query.get();
  const filteredDocs = snapshot.docs.filter((doc) =>
    matchesStageFilter(doc.data() as FixSessionDoc, stage)
  );

  const pageDocs = filteredDocs.slice(0, limit + 1);
  const hasMore = pageDocs.length > limit;
  const docs = hasMore ? pageDocs.slice(0, limit) : pageDocs;

  const uidSet = new Set<string>();
  for (const doc of docs) {
    const uid = doc.ref.parent.parent?.id;
    if (uid) {
      uidSet.add(uid);
    }
  }

  const userRefs = [...uidSet].map((uid) => adminDb!.collection('users').doc(uid));
  const userSnapshots =
    userRefs.length > 0 ? await adminDb.getAll(...userRefs) : [];

  const usersByUid = new Map<string, Record<string, unknown>>();
  for (const userSnap of userSnapshots) {
    if (userSnap.exists) {
      usersByUid.set(userSnap.id, userSnap.data() as Record<string, unknown>);
    }
  }

  const jobs: FixJobListItem[] = docs.map((doc) => {
    const uid = doc.ref.parent.parent?.id ?? '';
    const sessionData = doc.data() as FixSessionDoc;
    return mapSessionDocToListItem(doc.id, uid, sessionData, usersByUid.get(uid));
  });

  const nextCursor =
    hasMore && jobs.length > 0 ? jobs[jobs.length - 1]?.updatedAt : undefined;

  return {
    jobs,
    ...(nextCursor ? { nextCursor } : {}),
  };
}

/** Assert list payload excludes sensitive admin-only fields */
export function assertFixJobListItemSanitized(job: FixJobListItem): FixJobListItem {
  const forbiddenKeys = [
    'credentials',
    'accessToken',
    'grantToken',
    'encryptedCredentials',
    'speedNarrative',
    'securityNarrative',
    'seoNarrative',
    'auditLeadId',
  ] as const;

  const serialized = JSON.stringify(job);
  for (const key of forbiddenKeys) {
    if (serialized.includes(key)) {
      throw new Error(`Forbidden field leaked into list item: ${key}`);
    }
  }

  return job;
}
