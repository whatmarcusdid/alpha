import { JobDetailPreviewShell } from '@/components/preview/JobDetailPreviewShell';
import { PREVIEW_DETAIL_JOB_SETUP_FILLED } from '@/app/(admin)/preview/_fixtures/fix-job';

export default function JobSetupFilledPreviewPage() {
  return (
    <JobDetailPreviewShell
      detail={PREVIEW_DETAIL_JOB_SETUP_FILLED}
      designQuestion="Is the transition from setup → active work clear?"
    />
  );
}
