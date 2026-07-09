import { findDeniedToolName } from '@/lib/fix-jobs/fix-update-utils';

export type DeliveryNoteValidationError = {
  status: 400;
  error: string;
};

export function validateDeliveryNote(
  deliveryNote: string | undefined
): DeliveryNoteValidationError | null {
  if (deliveryNote == null || deliveryNote.trim().length === 0) {
    return null;
  }

  const trimmed = deliveryNote.trim();

  if (trimmed.length > 500) {
    return {
      status: 400,
      error: 'Delivery note must be 500 characters or fewer',
    };
  }

  const denied = findDeniedToolName(trimmed);
  if (denied) {
    return {
      status: 400,
      error: `Delivery note contains a technical tool name — rewrite in plain language (found: "${denied}")`,
    };
  }

  return null;
}
