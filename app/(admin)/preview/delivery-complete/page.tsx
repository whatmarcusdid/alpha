import { JobDetailPreviewShell } from '@/components/preview/JobDetailPreviewShell';
import { PREVIEW_DETAIL_DELIVERY_COMPLETE } from '@/app/(admin)/preview/_fixtures/fix-job';

export default function DeliveryCompletePreviewPage() {
  return (
    <JobDetailPreviewShell
      detail={PREVIEW_DETAIL_DELIVERY_COMPLETE}
      designQuestion="Does the delivered state feel like a clear conclusion? Is the summary readable?"
    />
  );
}
