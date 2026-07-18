'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { trackBookServiceEvent } from '@/lib/book-service/analytics-client';
import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import { isDevPreviewEnabled } from '@/lib/book-service/dev-preview';
import {
  readCheckoutEmail,
  storeCheckoutEmail,
} from '@/lib/book-service/storage';
import {
  WHAT_HAPPENS_NEXT_ITEMS,
  buildConfirmationHeading,
  buildConfirmationSubtext,
  formatConfirmationDate,
  formatConfirmationEmail,
  formatOrderTotal,
  getFixItemsForOrder,
  getPlanSummary,
  getPreviewOrder,
} from '@/lib/book-service/order-confirmation';
import type { SiteFixOrderStatusResponse } from '@/lib/book-service/types';
import { SUPPORT_EMAIL } from '@/lib/config';

type ConfirmationView = 'loading' | 'confirmed' | 'timeout' | 'invalid';

const POLL_DELAYS_MS = [1000, 2000, 4000, 8000, 8000];

const LIST_CLASS =
  'list-disc space-y-0 text-lg leading-[1.5] text-[#030712] [&_ul]:mt-0 [&_ul]:list-disc [&>li]:ms-[27px] [&_ul>li]:ms-[54px]';

async function fetchOrderStatus(
  orderId: string,
  email: string
): Promise<{ ok: true; data: SiteFixOrderStatusResponse } | { ok: false; status: number }> {
  const params = new URLSearchParams({
    orderId,
    email: email.toLowerCase().trim(),
  });
  const response = await fetch(`/api/book-service/order-status?${params.toString()}`);

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
      <BookServiceHeader variant="bar" />
      <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col items-center px-6 pb-[120px] pt-10 md:px-[140px]">
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
  const confirmationEmail = formatConfirmationEmail(order);

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
          {confirmationEmail ? (
            <li>
              <span className="leading-[1.5]">Email: {confirmationEmail}</span>
            </li>
          ) : null}
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

      <PrimaryButton
        onClick={onContinue}
        disabled={continueDisabled}
        className="w-full"
      >
        Continue
      </PrimaryButton>
    </>
  );
}

function ConfirmationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderIdParam = searchParams.get('orderId');
  const emailParam = searchParams.get('email')?.toLowerCase().trim() ?? '';
  const isPreview = isDevPreviewEnabled(searchParams);
  const previewOrder = isPreview ? getPreviewOrder(searchParams) : null;

  const [checkoutEmail, setCheckoutEmail] = useState<string>(() => {
    if (emailParam) return emailParam;
    if (typeof window !== 'undefined') {
      return readCheckoutEmail() ?? '';
    }
    return '';
  });
  const [emailInput, setEmailInput] = useState<string>(checkoutEmail);
  const [view, setView] = useState<ConfirmationView>(() => {
    if (isPreview) return 'confirmed';
    if (!orderIdParam) return 'invalid';
    return checkoutEmail ? 'loading' : 'invalid';
  });
  const [order, setOrder] = useState<SiteFixOrderStatusResponse | null>(
    previewOrder
  );
  const [needsEmail, setNeedsEmail] = useState<boolean>(
    () => Boolean(orderIdParam) && !checkoutEmail && !isPreview
  );

  useEffect(() => {
    if (emailParam) {
      storeCheckoutEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    if (isPreview || !orderIdParam || needsEmail || !checkoutEmail) return;

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
          const result = await fetchOrderStatus(resolvedOrderId, checkoutEmail);
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
  }, [checkoutEmail, isPreview, needsEmail, orderIdParam]);

  const handleEmailSubmit = useCallback(() => {
    const normalized = emailInput.toLowerCase().trim();
    if (!normalized) return;
    storeCheckoutEmail(normalized);
    setCheckoutEmail(normalized);
    setNeedsEmail(false);
    setView('loading');
  }, [emailInput]);

  const handleContinueToSignup = useCallback(() => {
    const id = order?.orderId ?? orderIdParam;
    if (!id) return;
    router.push(`/book-service/signup?orderId=${encodeURIComponent(id)}`);
  }, [order?.orderId, orderIdParam, router]);

  if (needsEmail) {
    return (
      <ConfirmationPageShell>
        <div className="flex flex-col gap-4">
          <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            Confirm your email to view your order
          </h1>
          <p className="text-lg leading-[1.5] text-[#52525b]">
            Enter the email address you used at checkout so we can load your
            order confirmation.
          </p>
          <label className="flex flex-col gap-2 text-base font-medium text-[#030712]">
            Checkout email
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              className="min-h-[40px] rounded-lg border border-[#d4d4d8] px-3 text-base text-[#030712]"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </label>
          <PrimaryButton onClick={handleEmailSubmit} className="w-full">
            View confirmation
          </PrimaryButton>
        </div>
      </ConfirmationPageShell>
    );
  }

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
          <PrimaryButton href="/audit" className="w-full">
            Return to audit
          </PrimaryButton>
        </div>
      </ConfirmationPageShell>
    );
  }

  if (view === 'loading') {
    return (
      <ConfirmationPageShell>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-[#2920A5] border-t-transparent"
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
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-base font-semibold leading-[1.5] text-[#2920A5] underline"
          >
            {SUPPORT_EMAIL}
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
              className="h-10 w-10 animate-spin rounded-full border-4 border-[#2920A5] border-t-transparent"
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
