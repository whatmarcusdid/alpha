import { FieldValue } from 'firebase-admin/firestore';

import {
  getPillarForSignal,
  type AllFixSignalKey,
} from '@/lib/audit/fixPlaybook';
import { findDeniedToolName } from '@/lib/fix-jobs/fix-update-utils';
import { adminDb } from '@/lib/firebase/admin';
import type { FixUpdateDoc, FixUpdatePillar, RecentFixUpdate } from '@/lib/types/fix-update';

export type PostFixUpdateInput = {
  uid: string;
  sessionId: string;
  message: string;
  pillar?: 'speed' | 'security' | 'seo_ai_visibility';
  signalKey?: string;
};

export type PostFixUpdateError = {
  status: 400 | 404;
  error: string;
};

export type PostFixUpdateSuccess = {
  updateId: string;
};

function resolveUpdatePillar(input: PostFixUpdateInput): FixUpdatePillar {
  if (input.pillar === 'seo_ai_visibility') {
    return 'seo';
  }

  if (input.pillar) {
    return input.pillar;
  }

  if (input.signalKey) {
    const pillar = getPillarForSignal(input.signalKey as AllFixSignalKey);
    return pillar === 'seo_ai_visibility' ? 'seo' : pillar;
  }

  return 'general';
}

export function validateFixUpdateMessage(message: string): PostFixUpdateError | null {
  if (message.length === 0) {
    return { status: 400, error: 'Message cannot be empty' };
  }

  if (message.length > 280) {
    return { status: 400, error: 'Message must be 280 characters or fewer' };
  }

  const denied = findDeniedToolName(message);
  if (denied) {
    return {
      status: 400,
      error: `Update contains a technical tool name — rewrite in plain language (found: "${denied}")`,
    };
  }

  return null;
}

export async function postFixUpdate(
  input: PostFixUpdateInput
): Promise<PostFixUpdateSuccess | PostFixUpdateError> {
  const messageError = validateFixUpdateMessage(input.message);
  if (messageError) {
    return messageError;
  }

  if (!adminDb) {
    return { status: 400, error: 'Server configuration error' };
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(input.uid)
    .collection('fixSessions')
    .doc(input.sessionId);

  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return { status: 404, error: 'Fix job not found' };
  }

  const session = sessionSnap.data() as { fixProgress?: Record<string, unknown> };

  if (input.signalKey) {
    const progress = session.fixProgress?.[input.signalKey];
    if (!progress || !('completedStepIds' in (progress as object))) {
      return { status: 400, error: 'Signal key not found in this session' };
    }
  }

  const updateDoc = {
    message: input.message,
    createdAt: FieldValue.serverTimestamp(),
    pillar: resolveUpdatePillar(input),
    visibility: 'client' as const,
    pinned: false,
  };

  const updateRef = await adminDb
    .collection('users')
    .doc(input.uid)
    .collection('fixUpdates')
    .add(updateDoc);

  void sessionRef
    .update({ updatedAt: FieldValue.serverTimestamp() })
    .catch((error) => {
      console.error('[postFixUpdate] failed to bump session updatedAt:', error);
    });

  return { updateId: updateRef.id };
}
