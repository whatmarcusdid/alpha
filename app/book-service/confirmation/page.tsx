'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { trackBookServiceEvent } from '@/lib/book-service/analytics-client';
import { BookServiceLogoLink } from '@/lib/book-service/BookServiceHeader';
import { isDevPreviewEnabled } from '@/lib/book-service/dev-preview';
import {
  WHAT_HAPPENS_NEXT_ITEMS,
  buildConfirmationHeading,
  buildConfirmationSubtext,
  formatConfirmationDate,
  formatLinkedAuditLabel,
  formatOrderTotal,
  getFixItemsForOrder,
  getPlanSummary,
  getPreviewOrder,
} from '@/lib/book-service/order-confirmation';
import type { SiteFixOrderStatusResponse } from '@/lib/book-service/types';

type ConfirmationView = 'loading' | 'confirmed' | 'timeout' | 'invalid';

const POLL_DELAYS_MS = [1000, 2000, 4000, 8000, 8000];

const BS_PRIMARY_BTN =
  'flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#1d4ed8] px-6 py-[10px] text-base font-bold leading-[1.5] text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50';

const LIST_CLASS =
  'list-disc space-y-0 text-lg leading-[1.5] text-[#030712] [&_ul]:mt-0 [&_ul]:list-disc [&>li]:ms-[27px] [&_ul>li]:ms-[54px]';

async function fetchOrderStatus(
  orderId: string
): Promise<{ ok: true; data: SiteFixOrderStatusResponse } | { ok: false; status: number }> {
  const response = await fetch(
    `/api/book-service/order-status?orderId=${encodeURIComponent(orderId)}`
  );

  if (response.ok) {
    const payload = await response.json();
    if (payload?.success && payload?.data) {
      return { ok: true, data: payload.data as SiteFixOrderStatusResponse };
    }
  }

  return { ok: false, status: response.status };
}

function ConfirmationPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col items-center gap-20 px-6 pb-[120px] pt-10 md:px-[140px]">
        <div className="w-full">
          <BookServiceLogoLink variant="large" />
        </div>
        <div className="flex w-full max-w-[600px] flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}

function OrderConfirmationDetails({
  order,
  onContinue,
  continueDisabled = false,
}: {
  order: SiteFixOrderStatusResponse;
  onContinue: () => void;
  continueDisabled?: boolean;
}) {
  const fixItems = getFixItemsForOrder(order.sku, order.entitlements);
  const linkedAudit = formatLinkedAuditLabel(order.websiteUrl, order.auditLeadId);

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
          {buildConfirmationHeading(order)}
        </h1>
        <p className="text-lg leading-[1.5] text-[#030712]">
          {buildConfirmationSubtext(order)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold leading-[1.5] tracking-[-0.2px] text-[#030712]">
          Order Summary
        </h2>
        <ul className={LIST_CLASS}>
          <li>
            <span className="leading-[1.5]">Plan: {getPlanSummary(order)}</span>
          </li>
          <li>
            <span className="leading-[1.5]">Fixes included:</span>
            <ul>
              {fixItems.map((item) => (
                <li key={item}>
                  <span className="leading-[1.5]">{item}</span>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <span className="leading-[1.5]">
              Total Paid Today: {formatOrderTotal(order.sku)}
            </span>
          </li>
          <li>
            <span className="leading-[1.5]">Order ID: #{order.orderId}</span>
          </li>
          <li>
            <span className="leading-[1.5]">
              Date: {formatConfirmationDate(order.createdAt)}
            </span>
          </li>
          <li>
            <span className="leading-[1.5]">
              Linked Audit: {linkedAudit}
            </span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold leading-[1.5] tracking-[-0.2px] text-[#030712]">
          What Happens Next
        </h2>
        <ul className={`${LIST_CLASS} list-outside`}>
          {WHAT_HAPPENS_NEXT_ITEMS.map((item) => (
            <li key={item}>
              <span className="leading-[1.5]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled}
        title={continueDisabled ? 'Disabled in preview mode' : undefined}
        className={BS_PRIMARY_BTN}
      >
        Continue
      </button>
    </>
  );
}

function ConfirmationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderIdParam = searchParams.get('orderId');
  const isPreview = isDevPreviewEnabled(searchParams);
  const previewOrder = isPreview ? getPreviewOrder(searchParams) : null;

  const [view, setView] = useState<ConfirmationView>(() => {
    if (isPreview) return 'confirmed';
    return orderIdParam ? 'loading' : 'invalid';
  });
  const [order, setOrder] = useState<SiteFixOrderStatusResponse | null>(
    previewOrder
  );

  useEffect(() => {
    if (isPreview || !orderIdParam) return;

    trackBookServiceEvent('site_fix_confirmation_loaded', {
      orderId: orderIdParam,
    });

    let cancelled = false;

    async function poll() {
      if (!orderIdParam) {
        setView('invalid');
        return;
      }

      const resolvedOrderId = orderIdParam;

      for (let attempt = 0; attempt < POLL_DELAYS_MS.length; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, POLL_DELAYS_MS[attempt - 1])
          );
        }

        if (cancelled) return;

        try {
          const result = await fetchOrderStatus(resolvedOrderId);
          if (result.ok) {
            if (!cancelled) {
              setOrder(result.data);
              setView('confirmed');
            }
            return;
          }
        } catch {
          // network error — retry within attempt budget
        }
      }

      if (!cancelled) {
        setView('timeout');
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [isPreview, orderIdParam]);

  const handleContinueToSignup = useCallback(() => {
    const id = order?.orderId ?? orderIdParam;
    if (!id) return;
    router.push(`/book-service/signup?orderId=${encodeURIComponent(id)}`);
  }, [order?.orderId, orderIdParam, router]);

  if (view === 'invalid') {
    return (
      <ConfirmationPageShell>
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            Invalid confirmation link.
          </h1>
          <p className="text-lg leading-[1.5] text-[#52525b]">
            This link is missing order information. Return to your confirmation
            email or contact support.
          </p>
          <Link href="/audit" className={BS_PRIMARY_BTN}>
            Return to audit
          </Link>
        </div>
      </ConfirmationPageShell>
    );
  }

  if (view === 'loading') {
    return (
      <ConfirmationPageShell>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-[#1d4ed8] border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-lg font-semibold leading-[1.5] text-[#030712]">
            Confirming your payment…
          </p>
        </div>
      </ConfirmationPageShell>
    );
  }

  if (view === 'timeout') {
    return (
      <ConfirmationPageShell>
        <div className="flex flex-col gap-4">
          <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            Payment received — your confirmation is on its way.
          </h1>
          <p className="text-lg leading-[1.5] text-[#52525b]">
            If you don&apos;t see your confirmation email within a few minutes,
            please contact support.
          </p>
          <a
            href="mailto:support@tradesitegenie.com"
            className="text-base font-semibold leading-[1.5] text-[#1d4ed8] underline"
          >
            support@tradesitegenie.com
          </a>
        </div>
      </ConfirmationPageShell>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <ConfirmationPageShell>
      <OrderConfirmationDetails
        order={order}
        onContinue={handleContinueToSignup}
        continueDisabled={isPreview}
      />
    </ConfirmationPageShell>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <ConfirmationPageShell>
          <div className="flex items-center justify-center py-8">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-[#1d4ed8] border-t-transparent"
              aria-hidden="true"
            />
          </div>
        </ConfirmationPageShell>
      }
    >
      <ConfirmationPageContent />
    </Suspense>
  );
}
