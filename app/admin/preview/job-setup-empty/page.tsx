import { JobDetailPreviewShell } from '@/components/preview/JobDetailPreviewShell';
import { PREVIEW_DETAIL_JOB_SETUP_EMPTY } from '@/app/admin/preview/_fixtures/fix-job';

export default function JobSetupEmptyPreviewPage() {
  return (
    <JobDetailPreviewShell
      detail={PREVIEW_DETAIL_JOB_SETUP_EMPTY}
      designQuestion="Does the empty state communicate what Marcus needs to do first? (Confirm hosting context → Phase 0 → start work)"
    />
  );
}
