'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PreviewStateSelector } from '@/components/admin/PreviewStateSelector';
import { FixJobWorkspace } from '@/components/admin/FixJobWorkspace';
import {
  ADMIN_PREVIEW_STATE_OPTIONS,
  getAdminDashboardFixture,
  serializeAdminFixture,
} from '@/lib/preview/fixtures';
import {
  createPreviewAdminApiState,
  createPreviewAdminFetchHandler,
  type PreviewAdminApiState,
} from '@/lib/preview/mock-admin-api';

const PREVIEW_BASE_PATH = '/admin/preview/admin-dashboard';

function AdminDashboardPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stateKey = searchParams.get('state') ?? 'job-setup-empty';
  const fixture = useMemo(() => getAdminDashboardFixture(stateKey), [stateKey]);

  const apiStateRef = useRef<PreviewAdminApiState>(
    createPreviewAdminApiState(fixture)
  );
  const [, forceRender] = useState<number>(0);

  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam ?? String(fixture.defaultTab);

  useEffect(() => {
    apiStateRef.current = createPreviewAdminApiState(fixture);

    if (!tabParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', String(fixture.defaultTab));
      router.replace(`${PREVIEW_BASE_PATH}?${params.toString()}`, { scroll: false });
    }
  }, [fixture, router, searchParams, stateKey, tabParam]);

  useEffect(() => {
    const originalFetch = globalThis.fetch.bind(globalThis);

    globalThis.fetch = createPreviewAdminFetchHandler(
      () => apiStateRef.current,
      (next) => {
        apiStateRef.current = next;
        forceRender((value) => value + 1);
      }
    ) as typeof fetch;

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, [stateKey]);

  const serialized = serializeAdminFixture(fixture);

  return (
    <>
      <PreviewStateSelector
        states={ADMIN_PREVIEW_STATE_OPTIONS}
        currentState={stateKey}
        basePath={PREVIEW_BASE_PATH}
      />

      <FixJobWorkspace
        key={`${stateKey}-${defaultTab}`}
        initialJob={serialized.job}
        preview={{
          basePath: PREVIEW_BASE_PATH,
          stateKey,
        }}
      />
    </>
  );
}

export function AdminDashboardPreviewShell() {
  return (
    <Suspense fallback={<div className="py-12 text-zinc-600">Loading preview…</div>}>
      <AdminDashboardPreviewContent />
    </Suspense>
  );
}
