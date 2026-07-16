'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { SessionExpiredModal } from '@/components/book-service/SessionExpiredModal';
import { SiteFixReviewCard } from '@/components/book-service/SiteFixReviewCard';
import { SiteFixSelectLayout } from '@/components/book-service/SiteFixSelectLayout';
import { trackBookServiceEvent } from '@/lib/book-service/analytics-client';
import {
  buildSelectPageHref,
} from '@/lib/book-service/build-select-url';
import {
  getDisplaySkus,
  isValidSiteFixSku,
  parseSkusParam,
} from '@/lib/book-service/parse-skus-param';
import { readAuditLeadId } from '@/lib/book-service/storage';
import type { SiteFixSKU } from '@/lib/book-service/skus';
import { SUPPORT_EMAIL } from '@/lib/config';

function ReviewPageContent() {
  const params = useParams<{ sku: string }>();
  const searchParams = useSearchParams();
  const [auditLeadId, setAuditLeadId] = useState<string | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState<boolean>(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const skuParam = params.sku;
  const allowedSkus = useMemo(
    () => getDisplaySkus(parseSkusParam(searchParams.get('skus'))),
    [searchParams]
  );

  const sku = isValidSiteFixSku(skuParam) ? skuParam : null;
  const isSkuAllowed = sku !== null && allowedSkus.includes(sku);
  const normalizedEmail = searchParams.get('email')?.toLowerCase().trim();
  const selectPageHref = buildSelectPageHref(searchParams);

  useEffect(() => {
    setAuditLeadId(readAuditLeadId());
    setHasCheckedSession(true);
  }, []);

  const showSessionExpiredModal =
    hasCheckedSession && (!auditLeadId || !isSkuAllowed);

  async function handleProceedToCheckout() {
    if (!auditLeadId || !sku || !isSkuAllowed) {
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutError(null);
    trackBookServiceEvent('site_fix_sku_selected', { sku });
    trackBookServiceEvent('site_fix_checkout_started', { sku, auditLeadId });

    try {
      const body: {
        auditLeadId: string;
        sku: SiteFixSKU;
        normalizedEmail?: string;
      } = { auditLeadId, sku };

      if (normalizedEmail) {
        body.normalizedEmail = normalizedEmail;
      }

      const res = await fetch('/api/book-service/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.data?.url) {
        setCheckoutError('Something went wrong. Please try again.');
        return;
      }

      window.location.href = data.data.url;
    } catch {
      setCheckoutError('Something went wrong. Please try again.');
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  if (!hasCheckedSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-[#52525b]">Loading review…</p>
      </div>
    );
  }

  return (
    <>
      <SiteFixSelectLayout
        breadcrumbItems={[
          { label: 'Results', href: '/audit' },
          { label: 'Packages', href: selectPageHref },
          { label: 'Review' },
        ]}
        backHref={selectPageHref}
        pageTitle="Review your selection"
        pageDescription="Take a final look at what's included below. Once you check out, we'll get to work."
        contentMaxWidthClassName="max-w-[600px]"
        contentClassName="flex flex-col items-end"
      >
        {sku && isSkuAllowed && auditLeadId ? (
          <div className="flex w-full flex-col items-end gap-6">
            <SiteFixReviewCard sku={sku} />

            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                disabled={isCheckoutLoading}
                onClick={handleProceedToCheckout}
                className="min-h-[48px] w-full rounded-lg border-[3px] border-[#2920a5] px-6 py-[10px] text-base font-semibold leading-[1.5] text-[#2920a5] transition-colors hover:bg-[#f4f3ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCheckoutLoading ? 'Processing…' : 'Proceed To Checkout'}
              </button>

              {checkoutError !== null && (
                <div className="flex flex-col gap-2" role="alert">
                  <p className="text-sm font-semibold leading-[1.5] text-[#e7000b]">
                    {checkoutError}
                  </p>
                  <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
                    Need help? Email{' '}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div aria-hidden className="min-h-[320px] w-full" />
        )}
      </SiteFixSelectLayout>

      {showSessionExpiredModal ? <SessionExpiredModal /> : null}
    </>
  );
}

export default function BookServiceSelectSkuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-[#52525b]">Loading review…</p>
        </div>
      }
    >
      <ReviewPageContent />
    </Suspense>
  );
}
