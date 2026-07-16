'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { getCurrentUser } from '@/lib/auth';
import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import {
  SAMPLE_ACCESS_FORM,
  SAMPLE_CONFIRM_DETAILS_ORDER_ID,
  isDevPreviewEnabled,
} from '@/lib/book-service/dev-preview';
import { SUPPORT_EMAIL } from '@/lib/config';

const ACCESS_METHODS = [
  'WordPress login',
  'Hosting panel login',
  'Other',
] as const;

type AccessMethod = (typeof ACCESS_METHODS)[number];
type LoadingAction = 'submit' | 'save' | null;

type AccessForm = {
  accessMethod: AccessMethod | '';
  loginUrl: string;
  username: string;
  password: string;
  hostingProvider: string;
  notes: string;
  confirmed: boolean;
};

const FILLED_INPUT_CLASS =
  'flex h-[40px] min-h-[40px] w-full rounded-[6px] border border-[#d1d5db] bg-[rgba(41,32,165,0.1)] px-5 py-3 text-sm tracking-[-0.14px] text-[#030712] placeholder:text-[#52525b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2920A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const OPTIONAL_INPUT_CLASS =
  'flex h-[40px] min-h-[40px] w-full rounded-[6px] border border-[#d1d5db] bg-white px-5 py-3 text-sm tracking-[-0.14px] text-[#030712] placeholder:text-[#52525b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2920A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const OPTIONAL_TEXTAREA_CLASS =
  'h-[140px] min-h-[140px] w-full resize-none rounded-[6px] border border-[#d1d5db] bg-white px-5 py-3 text-sm tracking-[-0.14px] text-[#030712] placeholder:text-[#52525b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2920A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const FIELD_HINT_CLASS =
  'text-[10px] leading-[1.5] tracking-[-0.1px] text-[#030712]';

function normalizeLoginUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function mapSubmitAccessError(status: number): string {
  if (status === 403) {
    return 'Something went wrong. Please contact support.';
  }
  if (status === 429) {
    return 'Too many attempts. Please wait a moment.';
  }
  return 'Something went wrong. Please try again.';
}

function AccessPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col items-center gap-20 px-6 pb-[120px] pt-10 md:px-[140px]">
        <div className="w-full">
          <BookServiceHeader variant="inline" />
        </div>
        <div className="flex w-full max-w-[600px] flex-col items-center gap-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function AccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPreview = isDevPreviewEnabled(searchParams);
  const orderId = isPreview
    ? SAMPLE_CONFIRM_DETAILS_ORDER_ID
    : searchParams.get('orderId');

  const [authChecked, setAuthChecked] = useState<boolean>(isPreview);
  const [form, setForm] = useState<AccessForm>(
    isPreview
      ? SAMPLE_ACCESS_FORM
      : {
          accessMethod: '',
          loginUrl: '',
          username: '',
          password: '',
          hostingProvider: '',
          notes: '',
          confirmed: false,
        }
  );
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    if (isPreview) return;

    const user = getCurrentUser();
    if (!user) {
      const redirectTarget = orderId
        ? `/book-service/access?orderId=${encodeURIComponent(orderId)}`
        : '/book-service/access';
      router.push(`/signin?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }
    setAuthChecked(true);
  }, [isPreview, orderId, router]);

  const isFullSubmitReady = useMemo(
    () =>
      form.accessMethod !== '' &&
      form.loginUrl.trim() !== '' &&
      form.username.trim() !== '' &&
      form.password.trim() !== '' &&
      form.confirmed,
    [form]
  );

  const submitAccess = async (partial: boolean) => {
    if (isPreview) return;
    if (!orderId) return;
    if (!partial && !isFullSubmitReady) return;

    setSubmitError('');
    setLoadingAction(partial ? 'save' : 'submit');

    try {
      const user = getCurrentUser();
      if (!user) {
        router.push(
          `/signin?redirect=${encodeURIComponent(`/book-service/access?orderId=${orderId}`)}`
        );
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/book-service/submit-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          partial,
          accessMethod: form.accessMethod || undefined,
          loginUrl: normalizeLoginUrl(form.loginUrl) || undefined,
          username: form.username.trim() || undefined,
          password: form.password || undefined,
          hostingProvider: form.hostingProvider.trim() || undefined,
          notes: form.notes.trim() || undefined,
          confirmed: form.confirmed,
        }),
      });

      if (!response.ok) {
        setSubmitError(mapSubmitAccessError(response.status));
        return;
      }

      router.push('/dashboard');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  if (!orderId) {
    return (
      <AccessPageShell>
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            Invalid link
          </h1>
          <p className="text-lg leading-[1.5] text-[#52525b]">
            Missing order information. Please return to your dashboard.
          </p>
          <PrimaryButton href="/dashboard" className="w-full">
            Go to dashboard
          </PrimaryButton>
        </div>
      </AccessPageShell>
    );
  }

  if (!authChecked) {
    return (
      <AccessPageShell>
        <div className="flex items-center justify-center py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2920A5] border-t-transparent" />
        </div>
      </AccessPageShell>
    );
  }

  return (
    <AccessPageShell>
      <h1 className="w-full text-center text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
        Last step — share access so we can get to work.
      </h1>

      <div className="flex w-full gap-3 rounded-lg border border-[#713f12] bg-[#fef9c3] p-4">
        <Lock className="size-6 shrink-0 text-[#232521]" aria-hidden="true" />
        <p className="text-base font-medium leading-[1.5] text-[#232521]">
          Your login is only used to make the fixes you paid for. When we&apos;re
          done, your credentials are deleted from our system — not stored, not
          shared, not used for anything else.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitAccess(false);
        }}
        className="flex w-full flex-col gap-6"
      >
        <div className="flex w-full flex-col gap-2">
          <span className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]">
            How should we log in?
          </span>
          <div className="flex flex-col gap-2">
            {ACCESS_METHODS.map((method) => {
              const selected = form.accessMethod === method;
              return (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center gap-4 rounded-[6px] border-2 p-4 transition-colors ${
                    selected
                      ? 'border-[#1d4ed8] bg-[rgba(29,78,216,0.1)]'
                      : 'border-[#ddd] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="accessMethod"
                    value={method}
                    checked={selected}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, accessMethod: method }))
                    }
                    className="size-5 shrink-0 accent-[#1d4ed8]"
                  />
                  <span className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#232521]">
                    {method}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-[5px]">
          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="loginUrl"
              className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
            >
              Where do you log into your website?
            </label>
            <input
              id="loginUrl"
              type="text"
              placeholder="brightpathpw.com/wp-admin"
              value={form.loginUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, loginUrl: e.target.value }))
              }
              disabled={loadingAction !== null}
              className={FILLED_INPUT_CLASS}
            />
          </div>
          <p className={FIELD_HINT_CLASS}>
            Usually ends in /wp-admin or /wp-login.php
          </p>
        </div>

        <div className="flex flex-col gap-[5px]">
          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="username"
              className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
            >
              Your username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="jake_brightpath"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              disabled={loadingAction !== null}
              className={FILLED_INPUT_CLASS}
            />
          </div>
          <p className={FIELD_HINT_CLASS}>
            This is what you type to log in — not your email, unless that&apos;s
            what you use
          </p>
        </div>

        <div className="flex flex-col gap-[5px]">
          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="password"
              className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
            >
              Your password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              disabled={loadingAction !== null}
              className={FILLED_INPUT_CLASS}
            />
          </div>
          <p className={FIELD_HINT_CLASS}>
            Encrypted when you send it. Deleted as soon as your fix is done.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <label
            htmlFor="hostingProvider"
            className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
          >
            Who hosts your website? (Optional)
          </label>
          <input
            id="hostingProvider"
            type="text"
            placeholder="e.g. Bluehost, GoDaddy, SiteGround"
            value={form.hostingProvider}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, hostingProvider: e.target.value }))
            }
            disabled={loadingAction !== null}
            className={OPTIONAL_INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <label
            htmlFor="notes"
            className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
          >
            Anything we should avoid touching? (Optional)
          </label>
          <textarea
            id="notes"
            placeholder="e.g. Don't touch the booking plugin — we just got it set up."
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            disabled={loadingAction !== null}
            className={OPTIONAL_TEXTAREA_CLASS}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 p-2">
          <input
            type="checkbox"
            checked={form.confirmed}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, confirmed: e.target.checked }))
            }
            disabled={loadingAction !== null}
            className="mt-0.5 size-5 shrink-0 rounded-[4px] border border-[#b5b6b5] accent-[#1d4ed8]"
          />
          <span className="text-sm leading-[1.5] tracking-[-0.14px] text-[#030712]">
            I&apos;m giving Book Service temporary access to my website to complete
            my fixes. I know my credentials will be deleted when the work is done.
          </span>
        </label>

        <PrimaryButton
          type="submit"
          disabled={!isFullSubmitReady || loadingAction !== null || isPreview}
          title={isPreview ? 'Disabled in preview mode' : undefined}
          className="w-full"
        >
          <ShieldCheck className="size-6 shrink-0" aria-hidden="true" />
          {loadingAction === 'submit' ? 'Submitting…' : 'Submit access'}
        </PrimaryButton>

        {submitError ? (
          <p className="text-left text-sm font-semibold leading-[1.5] text-[#e7000b]">
            {submitError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loadingAction !== null || isPreview}
          title={isPreview ? 'Disabled in preview mode' : undefined}
          onClick={() => void submitAccess(true)}
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg border-2 border-[#2920A5] bg-white px-6 py-[10px] text-base font-semibold leading-[1.5] text-[#2920A5] transition-colors hover:bg-[#f4f3ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === 'save' ? 'Saving…' : 'Save and finish later'}
        </button>

        <p className="text-center text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
          Real people, real support. Questions before you submit? Email us at{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="underline decoration-solid underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </form>
    </AccessPageShell>
  );
}

export default function BookServiceAccessPage() {
  return (
    <Suspense
      fallback={
        <AccessPageShell>
          <p className="text-center text-[#52525b]">Loading…</p>
        </AccessPageShell>
      }
    >
      <AccessContent />
    </Suspense>
  );
}
