import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { FixJobWorkspace } from '@/components/admin/FixJobWorkspace';
import { requireAdminSession } from '@/lib/admin/require-admin-session';
import { getFixJob } from '@/lib/fix-jobs/firestore';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ fixJobId: string }>;
};

export default async function FixJobWorkspacePage({ params }: PageProps) {
  await requireAdminSession();
  const { fixJobId } = await params;
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
