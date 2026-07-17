'use client';

import { Suspense } from 'react';

import { FixJobsHomeScreenContainer } from '@/components/admin/FixJobsHomeScreenContainer';

export default function AdminHomePage() {
  return (
    <Suspense fallback={<div className="py-12 text-zinc-600">Loading admin home…</div>}>
      <FixJobsHomeScreenContainer />
    </Suspense>
  );
}
