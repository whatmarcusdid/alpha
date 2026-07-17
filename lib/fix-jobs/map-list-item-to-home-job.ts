import {
  listEntitlementsToHomeFilter,
  type AdminHomeJob,
} from '@/lib/fix-jobs/home-bucketing';
import type { FixJobListItem } from '@/lib/types/fix-session';

export type { AdminHomeJob };

export function mapListItemToAdminHomeJob(item: FixJobListItem): AdminHomeJob {
  return {
    sessionId: item.sessionId,
    uid: item.uid,
    businessName: item.customerName,
    primaryWebsiteUrl: item.siteUrl,
    displayId: item.sessionId,
    stage: item.stage,
    updatedAt: new Date(item.updatedAt),
    entitlements: listEntitlementsToHomeFilter(item.entitlements),
  };
}
