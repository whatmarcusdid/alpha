import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import { serializeConfirmedHostingContext } from '@/lib/fix-jobs/build-hosting-context-payload';
import { adminDb } from '@/lib/firebase/admin';
import type { HostingContextPayload } from '@/lib/types/hosting-context';

export type ConfirmHostingContextInput = {
  uid: string;
  sessionId: string;
  adminUid: string;
  host: string;
  hostLabel?: string;
  cms: string;
  cmsVersion?: string;
  plugins: string[];
};

export type ConfirmHostingContextResult =
  | { success: true; hostingContext: HostingContextPayload }
  | { success: false; status: 404 | 500; error: string };

export async function confirmHostingContext(
  input: ConfirmHostingContextInput
): Promise<ConfirmHostingContextResult> {
  if (!adminDb) {
    return { success: false, status: 500, error: 'Server configuration error' };
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(input.uid)
    .collection('fixSessions')
    .doc(input.sessionId);

  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return { success: false, status: 404, error: 'Fix job not found' };
  }

  const confirmedAt = new Date().toISOString();

  await adminDb.collection('users').doc(input.uid).update({
    'hostingContext.host': input.host,
    'hostingContext.hostLabel': input.hostLabel ?? null,
    'hostingContext.cms': input.cms,
    'hostingContext.cmsVersion': input.cmsVersion ?? null,
    'hostingContext.plugins': input.plugins,
    'hostingContext.confirmedAt': confirmedAt,
    'hostingContext.confirmedBy': input.adminUid,
  });

  await sessionRef.update({
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    hostingContext: serializeConfirmedHostingContext({
      host: input.host,
      hostLabel: input.hostLabel,
      cms: input.cms,
      cmsVersion: input.cmsVersion,
      plugins: input.plugins,
      confirmedAt,
      confirmedBy: input.adminUid,
    }),
  };
}
