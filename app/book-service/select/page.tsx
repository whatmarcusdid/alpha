'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  SiteFixBottomSheet,
  SiteFixPackagesSheet,
} from '@/components/book-service/SiteFixBottomSheet';
import { trackBookServiceEvent } from '@/lib/book-service/analytics-client';
import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import {
  ALL_SITE_FIX_SKUS,
  type SiteFixSKU,
} from '@/lib/book-service/skus';
import { readAuditLeadId } from '@/lib/book-service/storage';

function parseSkusParam(skusParam: string | null): SiteFixSKU[] {
  if (!skusParam?.trim()) {
    return ALL_SITE_FIX_SKUS;
  }

  const valid = new Set<SiteFixSKU>(ALL_SITE_FIX_SKUS);
  const parsed = skusParam
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is SiteFixSKU => valid.has(s as SiteFixSKU));

  return parsed.length > 0 ? parsed : ALL_SITE_FIX_SKUS;
}

function SelectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [auditLeadId, setAuditLeadId] = useState<string | null>(null);
  const [isPackagesSheetActive, setIsPackagesSheetActive] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SiteFixSKU | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const normalizedEmail = searchParams.get('email')?.toLowerCase().trim();

  const skusToShow = useMemo(
    () => parseSkusParam(searchParams.get('skus')),
    [searchParams]
  );

  useEffect(() => {
    setAuditLeadId(readAuditLeadId());
    trackBookServiceEvent('site_fix_offer_viewed', {
      skus: skusToShow.join(','),
    });
  }, [skusToShow]);

  useEffect(() => {
    if (!auditLeadId) return;

    setIsPackagesSheetActive(true);
  }, [auditLeadId]);

  async function handleConfirm(sku: SiteFixSKU) {
    if (!auditLeadId) return;

    setIsCheckoutLoading(true);
    setCheckoutError(null);
    trackBookServiceEvent('site_fix_sku_selected', { sku });
    trackBookServiceEvent('site_fix_checkout_started', { sku, auditLeadId });

    try {
      const res = await fetch('/api/book-service/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditLeadId, sku, normalizedEmail }),
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

  function handleCloseConfirmSheet() {
    setSelectedSku(null);
    setCheckoutError(null);
  }

  function handleClosePackagesSheet() {
    setIsPackagesSheetActive(false);
    router.push('/audit');
  }

  if (!auditLeadId) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <BookServiceHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#0F172A]">Session expired</h1>
          <p className="text-base text-gray-600">
            Please return to your audit results to continue.
          </p>
          <button
            type="button"
            onClick={() => router.push('/audit')}
            className="min-h-[48px] rounded-lg bg-[#2563EB] px-6 py-3 text-base font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Back to audit results
          </button>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-white">
        <BookServiceHeader />
      </div>

      <SiteFixPackagesSheet
        skus={skusToShow}
        isActive={isPackagesSheetActive}
        onClose={handleClosePackagesSheet}
        onSelectSku={setSelectedSku}
      />

      <SiteFixBottomSheet
        sku={selectedSku}
        onClose={handleCloseConfirmSheet}
        onConfirm={handleConfirm}
        isLoading={isCheckoutLoading}
        error={checkoutError}
      />
    </>
  );
}

export default function BookServiceSelectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-gray-600">Loading packages…</p>
        </div>
      }
    >
      <SelectPageContent />
    </Suspense>
  );
}
