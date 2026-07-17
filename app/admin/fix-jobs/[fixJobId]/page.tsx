import { Suspense } from 'react';

import { JobDetailScreen } from '@/components/admin/JobDetailScreen';
import { FixJobWorkspace } from '@/components/admin/FixJobWorkspace';
import { requireAdminSession } from '@/lib/admin/require-admin-session';
import { getFixJob } from '@/lib/fix-jobs/firestore';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ fixJobId: string }>;
  searchParams: Promise<{ uid?: string }>;
};

export default async function FixJobDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdminSession();
  const { fixJobId } = await params;
  const { uid } = await searchParams;

  if (uid) {
    return (
      <Suspense fallback={<div className="py-12 text-zinc-600">Loading fix job…</div>}>
        <JobDetailScreen sessionId={fixJobId} />
      </Suspense>
    );
  }

  const job = await getFixJob(fixJobId);

  if (!job) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="py-12 text-zinc-600">Loading workspace…</div>}>
      <FixJobWorkspace initialJob={serializeFixJob(job)} />
    </Suspense>
  );
}
