'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { JobDetailScreen } from '@/components/admin/JobDetailScreen';
import { PreviewBanner } from '@/components/preview/PreviewBanner';
import {
  FIXTURE_SESSION_ID,
  FIXTURE_UID,
} from '@/app/(admin)/preview/_fixtures/fix-job';
import {
  createPreviewJobDetailApiState,
  createPreviewJobDetailFetchHandler,
  type PreviewJobDetailApiState,
} from '@/lib/preview/mock-job-detail-api';
import type { FixJobDetailPayload } from '@/lib/types/fix-session';

type JobDetailPreviewShellProps = {
  detail: FixJobDetailPayload;
  designQuestion?: string;
};

function JobDetailPreviewContent({ detail, designQuestion }: JobDetailPreviewShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiStateRef = useRef<PreviewJobDetailApiState>(createPreviewJobDetailApiState(detail));
  const [, forceRender] = useState(0);

  useEffect(() => {
    apiStateRef.current = createPreviewJobDetailApiState(detail);
  }, [detail]);

  useEffect(() => {
    if (!searchParams.get('uid')) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('uid', FIXTURE_UID);
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    const originalFetch = globalThis.fetch.bind(globalThis);

    globalThis.fetch = createPreviewJobDetailFetchHandler(
      () => apiStateRef.current,
      (next) => {
        apiStateRef.current = next;
        forceRender((value) => value + 1);
      },
      originalFetch
    ) as typeof fetch;

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, [detail]);

  return (
    <>
      <PreviewBanner designQuestion={designQuestion} />
      <JobDetailScreen sessionId={FIXTURE_SESSION_ID} />
    </>
  );
}

export function JobDetailPreviewShell(props: JobDetailPreviewShellProps) {
  return (
    <Suspense fallback={<div className="py-12 text-zinc-600">Loading preview…</div>}>
      <JobDetailPreviewContent {...props} />
    </Suspense>
  );
}
