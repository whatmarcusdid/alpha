import { JobDetailPreviewShell } from '@/components/preview/JobDetailPreviewShell';
import { PREVIEW_DETAIL_QA_IN_PROGRESS } from '@/app/(admin)/preview/_fixtures/fix-job';

export default function QaInProgressPreviewPage() {
  return (
    <JobDetailPreviewShell
      detail={PREVIEW_DETAIL_QA_IN_PROGRESS}
      designQuestion="Does the QA panel feel natural? Is the Pass/Fail button sizing right? Is the before/after grade strip clear?"
    />
  );
}
