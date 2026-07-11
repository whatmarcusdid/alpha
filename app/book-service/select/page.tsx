'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { SessionExpiredModal } from '@/components/book-service/SessionExpiredModal';
import { SiteFixPricingCard } from '@/components/book-service/SiteFixPricingCard';
import { SiteFixSelectLayout } from '@/components/book-service/SiteFixSelectLayout';
import { trackBookServiceEvent } from '@/lib/book-service/analytics-client';
import { buildSelectSkuHref } from '@/lib/book-service/build-select-url';
import {
  getDisplaySkus,
  parseSkusParam,
} from '@/lib/book-service/parse-skus-param';
import { readAuditLeadId } from '@/lib/book-service/storage';
import type { SiteFixSKU } from '@/lib/book-service/skus';

function SelectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [auditLeadId, setAuditLeadId] = useState<string | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState<boolean>(false);

  const skusToShow = useMemo(
    () => getDisplaySkus(parseSkusParam(searchParams.get('skus'))),
    [searchParams]
  );

  useEffect(() => {
    setAuditLeadId(readAuditLeadId());
    setHasCheckedSession(true);
    trackBookServiceEvent('site_fix_offer_viewed', {
      skus: skusToShow.join(','),
    });
  }, [skusToShow]);

  function handleSelectSku(sku: SiteFixSKU) {
    router.push(buildSelectSkuHref(sku, searchParams));
  }

  if (!hasCheckedSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-[#52525b]">Loading packages…</p>
      </div>
    );
  }

  if (!auditLeadId) {
    return (
      <>
        <SiteFixSelectLayout
          breadcrumbItems={[
            { label: 'Results', href: '/audit' },
            { label: 'Packages' },
          ]}
          backHref="/audit"
          pageTitle="Choose your fixes"
          pageDescription="Based on your audit results — pick the fix that applies to your site."
        >
          <div aria-hidden className="min-h-[320px]" />
        </SiteFixSelectLayout>
        <SessionExpiredModal />
      </>
    );
  }

  return (
    <SiteFixSelectLayout
      breadcrumbItems={[
        { label: 'Results', href: '/audit' },
        { label: 'Packages' },
      ]}
      backHref="/audit"
      pageTitle="Choose your fixes"
      pageDescription="Based on your audit results — pick the fix that applies to your site."
    >
      {skusToShow.length > 0 ? (
        <div className="flex flex-row flex-wrap items-start justify-center gap-6">
          {skusToShow.map((sku) => (
            <SiteFixPricingCard
              key={sku}
              sku={sku}
              onSelect={handleSelectSku}
            />
          ))}
        </div>
      ) : (
        <p className="text-base leading-[1.5] text-[#52525b]">
          No packages are available for your audit results right now. Return to
          your audit results to continue.
        </p>
      )}
    </SiteFixSelectLayout>
  );
}

export default function BookServiceSelectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-[#52525b]">Loading packages…</p>
        </div>
      }
    >
      <SelectPageContent />
    </Suspense>
  );
}
