import { JobDetailPreviewShell } from '@/components/preview/JobDetailPreviewShell';
import { PREVIEW_DETAIL_DELIVERY_IN_PROGRESS } from '@/app/admin/preview/_fixtures/fix-job';

export default function DeliveryInProgressPreviewPage() {
  return (
    <JobDetailPreviewShell
      detail={PREVIEW_DETAIL_DELIVERY_IN_PROGRESS}
      designQuestion="Is the path from report generated → send delivery clear? Does the recipient display and Loom URL input feel right?"
    />
  );
}
