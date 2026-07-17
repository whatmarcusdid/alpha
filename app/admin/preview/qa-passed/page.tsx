import { JobDetailPreviewShell } from '@/components/preview/JobDetailPreviewShell';
import { PREVIEW_DETAIL_QA_PASSED } from '@/app/admin/preview/_fixtures/fix-job';

export default function QaPassedPreviewPage() {
  return (
    <JobDetailPreviewShell
      detail={PREVIEW_DETAIL_QA_PASSED}
      designQuestion='Is the gate-unlock moment clear? Does "Report Ready" feel like a milestone?'
    />
  );
}
