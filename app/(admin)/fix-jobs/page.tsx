'use client';

import { Suspense } from 'react';

import { FixJobsQueueScreen } from '@/components/admin/FixJobsQueueScreen';

export default function FixJobsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-zinc-600">Loading fix jobs…</div>}>
      <FixJobsQueueScreen />
    </Suspense>
  );
}
