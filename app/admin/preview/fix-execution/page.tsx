import { JobDetailPreviewShell } from '@/components/preview/JobDetailPreviewShell';
import { PREVIEW_DETAIL_FIX_EXECUTION } from '@/app/admin/preview/_fixtures/fix-job';

export default function FixExecutionPreviewPage() {
  return (
    <JobDetailPreviewShell
      detail={PREVIEW_DETAIL_FIX_EXECUTION}
      designQuestion="Is the phase/task structure scannable during actual work? Can you tell at a glance what's done, what's in progress, what's next?"
    />
  );
}
