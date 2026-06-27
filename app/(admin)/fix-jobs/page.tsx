import { Suspense } from 'react';

import { FixJobsHomeScreen } from '@/components/admin/FixJobsHomeScreen';
import { requireAdminSession } from '@/lib/admin/require-admin-session';
import { listFixJobs } from '@/lib/fix-jobs/firestore';

export const dynamic = 'force-dynamic';

export default async function FixJobsHomePage() {
  const session = await requireAdminSession();
  const jobs = await listFixJobs();

  const adminFirstName =
    session.displayName?.split(' ')[0] ||
    session.email?.split('@')[0] ||
    'there';

  return (
    <Suspense fallback={<div className="py-12 text-zinc-600">Loading fix jobs…</div>}>
      <FixJobsHomeScreen jobs={jobs} adminFirstName={adminFirstName} />
    </Suspense>
  );
}
