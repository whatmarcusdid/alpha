'use client';

import { Suspense } from 'react';

import { UnlinkedAuditLeadsScreen } from '@/components/admin/UnlinkedAuditLeadsScreen';

export default function NeedsAuditLeadLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-zinc-600">Loading unlinked audit lead records…</div>
      }
    >
      <UnlinkedAuditLeadsScreen />
    </Suspense>
  );
}
