import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import {
  findPendingAccessRequestByToken,
  type TokenValidationError,
} from '@/lib/site-access/token-validation';

export type DeclineSiteAccessResult =
  | { success: true }
  | TokenValidationError
  | { success: false; status: 500; error: string };

export async function declineSiteAccess(
  rawToken: string
): Promise<DeclineSiteAccessResult> {
  const validation = await findPendingAccessRequestByToken(rawToken);
  if (!validation.success) {
    return validation;
  }

  if (!adminDb) {
    return { success: false, status: 500, error: 'Server configuration error' };
  }

  const { ref, doc } = validation;

  await adminDb.runTransaction(async (transaction) => {
    const currentSnap = await transaction.get(ref);
    if (!currentSnap.exists) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    const current = currentSnap.data() as typeof doc;
    if (current.tokenUsed || current.status !== 'pending') {
      throw new Error('TOKEN_ALREADY_USED');
    }

    transaction.update(ref, {
      status: 'declined',
      tokenUsed: true,
    });
  });

  return { success: true };
}
