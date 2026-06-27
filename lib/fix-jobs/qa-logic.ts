import { getQAItemsForEntitlements } from '@/lib/fix-jobs/qa-registry';
import type { FixJobEntitlements } from '@/lib/types/fix-job';
import type { QADoc, QAItemState } from '@/lib/types/loop';

export function createEmptyQAItems(
  entitlements: FixJobEntitlements
): Record<string, QAItemState> {
  const items = getQAItemsForEntitlements(entitlements);
  const result: Record<string, QAItemState> = {};

  for (const item of items) {
    result[item.id] = { result: null, flagNote: null };
  }

  return result;
}

export function computeQAOverallStatus(
  items: Record<string, QAItemState>,
  entitlements: FixJobEntitlements
): QADoc['overallStatus'] {
  const applicableItems = getQAItemsForEntitlements(entitlements);
  const values = applicableItems.map((item) => items[item.id]?.result ?? null);

  if (values.some((result) => result === 'fail')) {
    return 'failed';
  }

  if (values.every((result) => result === null)) {
    return 'not_started';
  }

  if (values.every((result) => result === 'pass' || result === 'flag')) {
    return 'passed';
  }

  return 'in_progress';
}

export function countQAPassed(
  items: Record<string, QAItemState>,
  entitlements: FixJobEntitlements
): { passed: number; total: number; flagged: number } {
  const applicableItems = getQAItemsForEntitlements(entitlements);
  let passed = 0;
  let flagged = 0;

  for (const item of applicableItems) {
    const result = items[item.id]?.result ?? null;
    if (result === 'pass') passed += 1;
    if (result === 'flag') flagged += 1;
  }

  return { passed, total: applicableItems.length, flagged };
}
