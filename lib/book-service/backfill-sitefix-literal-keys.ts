import {
  FieldValue,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

/** Top-level user doc keys written by the #38 .set(merge) bug — e.g. "siteFix.inviteStatus". */
export const SITE_FIX_LITERAL_KEY_PATTERN = /^siteFix\.(.+)$/;

export type SiteFixLiteralKeyBackfillPlan = {
  userId: string;
  literalKeys: string[];
  nestedWrites: Record<string, unknown>;
  literalDeletes: string[];
  skippedNestedFields: string[];
  conflicts: Array<{ field: string; literalValue: unknown; nestedValue: unknown }>;
};

export function findSiteFixLiteralTopLevelKeys(
  data: Record<string, unknown>
): string[] {
  return Object.keys(data).filter((key) => SITE_FIX_LITERAL_KEY_PATTERN.test(key));
}

export function buildSiteFixLiteralKeyBackfillPlan(
  userId: string,
  data: Record<string, unknown>
): SiteFixLiteralKeyBackfillPlan | null {
  const literalKeys = findSiteFixLiteralTopLevelKeys(data);
  if (literalKeys.length === 0) {
    return null;
  }

  const siteFix =
    data.siteFix && typeof data.siteFix === 'object'
      ? (data.siteFix as Record<string, unknown>)
      : {};

  const nestedWrites: Record<string, unknown> = {};
  const literalDeletes: string[] = [];
  const skippedNestedFields: string[] = [];
  const conflicts: SiteFixLiteralKeyBackfillPlan['conflicts'] = [];

  for (const literalKey of literalKeys) {
    const match = literalKey.match(SITE_FIX_LITERAL_KEY_PATTERN);
    if (!match) {
      continue;
    }

    const fieldName = match[1]!;
    const literalValue = data[literalKey];
    const nestedValue = siteFix[fieldName];

    if (nestedValue === undefined) {
      nestedWrites[`siteFix.${fieldName}`] = literalValue;
    } else if (valuesEqualForBackfill(nestedValue, literalValue)) {
      skippedNestedFields.push(fieldName);
    } else {
      conflicts.push({ field: fieldName, literalValue, nestedValue });
    }

    literalDeletes.push(literalKey);
  }

  return {
    userId,
    literalKeys,
    nestedWrites,
    literalDeletes,
    skippedNestedFields,
    conflicts,
  };
}

function valuesEqualForBackfill(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a == null && b == null) {
    return true;
  }

  return JSON.stringify(a) === JSON.stringify(b);
}

export type SiteFixLiteralKeyBackfillResult = {
  scanned: number;
  affected: number;
  applied: number;
  skippedConflicts: number;
  plans: SiteFixLiteralKeyBackfillPlan[];
};

export async function runSiteFixLiteralKeyBackfill(
  db: Firestore,
  options: { apply: boolean; pageSize?: number }
): Promise<SiteFixLiteralKeyBackfillResult> {
  const pageSize = options.pageSize ?? 500;
  const result: SiteFixLiteralKeyBackfillResult = {
    scanned: 0,
    affected: 0,
    applied: 0,
    skippedConflicts: 0,
    plans: [],
  };

  let lastDoc: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection('users').orderBy('__name__').limit(pageSize);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    for (const doc of snapshot.docs) {
      result.scanned += 1;
      const data = doc.data() as Record<string, unknown>;
      const plan = buildSiteFixLiteralKeyBackfillPlan(doc.id, data);
      if (!plan) {
        continue;
      }

      result.affected += 1;
      result.plans.push(plan);

      if (plan.conflicts.length > 0) {
        result.skippedConflicts += 1;
      }

      if (!options.apply) {
        continue;
      }

      const updatePayload: Record<string, unknown> = { ...plan.nestedWrites };
      for (const literalKey of plan.literalDeletes) {
        updatePayload[literalKey] = FieldValue.delete();
      }

      await doc.ref.update(updatePayload);
      result.applied += 1;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) {
      break;
    }
  }

  return result;
}
