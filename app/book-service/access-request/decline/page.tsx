'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  AccessRequestPageShell,
  AccessRequestStatusCard,
} from '@/components/book-service/AccessRequestStatusCard';
import {
  submitAccessDecline,
  type AccessRequestPageState,
} from '@/lib/site-access/client/access-request-page-logic';

function DeclineAccessContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AccessRequestPageState>('loading');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setState('missing_token');
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await submitAccessDecline(token);
      if (cancelled) {
        return;
      }

      if (result.state === 'success') {
        setState('success');
        return;
      }

      setState(result.state);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return <AccessRequestStatusCard variant="decline" state={state} />;
}

export default function DeclineAccessRequestPage() {
  return (
    <Suspense
      fallback={
        <AccessRequestPageShell>
          <AccessRequestStatusCard variant="decline" state="loading" />
        </AccessRequestPageShell>
      }
    >
      <AccessRequestPageShell>
        <DeclineAccessContent />
      </AccessRequestPageShell>
    </Suspense>
  );
}
