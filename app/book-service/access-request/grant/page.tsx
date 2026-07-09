'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  AccessRequestPageShell,
  AccessRequestStatusCard,
} from '@/components/book-service/AccessRequestStatusCard';
import {
  formatAccessExpiryDate,
  submitAccessGrant,
  type AccessRequestPageState,
} from '@/lib/site-access/client/access-request-page-logic';

function GrantAccessContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AccessRequestPageState>('loading');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setState('missing_token');
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await submitAccessGrant(token);
      if (cancelled) {
        return;
      }

      if (result.state === 'success') {
        setExpiresAt(result.expiresAt);
        setState('success');
        return;
      }

      setState(result.state);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <AccessRequestStatusCard
      variant="grant"
      state={state}
      expiresAt={expiresAt}
      formattedExpiresAt={expiresAt ? formatAccessExpiryDate(expiresAt) : undefined}
    />
  );
}

export default function GrantAccessRequestPage() {
  return (
    <Suspense
      fallback={
        <AccessRequestPageShell>
          <AccessRequestStatusCard variant="grant" state="loading" />
        </AccessRequestPageShell>
      }
    >
      <AccessRequestPageShell>
        <GrantAccessContent />
      </AccessRequestPageShell>
    </Suspense>
  );
}
