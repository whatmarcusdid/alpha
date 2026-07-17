'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { getCurrentUser } from '@/lib/auth';
import type { SiteFixUserNamespace } from '@/lib/book-service/createUser';
import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import {
  SAMPLE_CONFIRM_DETAILS_FORM,
  SAMPLE_CONFIRM_DETAILS_ORDER_ID,
  isDevPreviewEnabled,
} from '@/lib/book-service/dev-preview';
import { db } from '@/lib/firebase';

type DetailsForm = {
  businessName: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
};

const INPUT_CLASS =
  'flex h-[40px] min-h-[40px] w-full rounded-[6px] border border-[#d1d5db] bg-[rgba(41,32,165,0.1)] px-5 py-3 text-sm tracking-[-0.14px] text-[#030712] placeholder:text-[#52525b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2920A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const FIELD_CONFIG = [
  { field: 'businessName', label: 'Business name', type: 'text' },
  { field: 'websiteUrl', label: 'Website URL', type: 'text' },
  { field: 'contactName', label: 'First Name', type: 'text' },
  { field: 'contactEmail', label: 'Email address', type: 'email' },
] as const;

function DetailsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6" aria-hidden="true">
      {FIELD_CONFIG.map(({ field }) => (
        <div key={field} className="flex flex-col gap-2.5">
          <div className="h-3.5 w-28 animate-pulse rounded bg-[#e5e7eb]" />
          <div className="min-h-[40px] animate-pulse rounded-[6px] border border-[#d1d5db] bg-[rgba(29,78,216,0.1)]" />
        </div>
      ))}
      <div className="min-h-[44px] animate-pulse rounded-lg bg-[#e5e7eb]" />
    </div>
  );
}

function ConfirmDetailsPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
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

function ConfirmDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPreview = isDevPreviewEnabled(searchParams);
  const orderId = isPreview
    ? SAMPLE_CONFIRM_DETAILS_ORDER_ID
    : searchParams.get('orderId');

  const [loading, setLoading] = useState<boolean>(!isPreview);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [form, setForm] = useState<DetailsForm>(
    isPreview
      ? SAMPLE_CONFIRM_DETAILS_FORM
      : {
          businessName: '',
          websiteUrl: '',
          contactName: '',
          contactEmail: '',
        }
  );

  useEffect(() => {
    if (isPreview) return;

    let cancelled = false;

    async function loadSiteFix() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      const user = getCurrentUser();
      if (!user) {
        router.push(
          `/book-service/signup?orderId=${encodeURIComponent(orderId)}`
        );
        return;
      }

      if (!db) {
        setSubmitError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      try {
        const { doc, getDoc } = require('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const siteFix = snap.data()?.siteFix as SiteFixUserNamespace | undefined;

        if (cancelled) return;

        if (!siteFix || siteFix.orderId !== orderId) {
          setSubmitError('Something went wrong. Please try again.');
          setLoading(false);
          return;
        }

        setForm({
          businessName: siteFix.businessName ?? '',
          websiteUrl: siteFix.websiteUrl ?? '',
          contactName: siteFix.contactName ?? '',
          contactEmail: siteFix.contactEmail ?? '',
        });
      } catch {
        if (!cancelled) {
          setSubmitError('Something went wrong. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSiteFix();

    return () => {
      cancelled = true;
    };
  }, [isPreview, orderId, router]);

  const isComplete = useMemo(
    () =>
      form.businessName.trim() !== '' &&
      form.websiteUrl.trim() !== '' &&
      form.contactName.trim() !== '' &&
      form.contactEmail.trim() !== '',
    [form]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPreview || !orderId || !isComplete) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const user = getCurrentUser();
      if (!user) {
        router.push(
          `/book-service/signup?orderId=${encodeURIComponent(orderId)}`
        );
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/book-service/confirm-details', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          businessName: form.businessName.trim(),
          websiteUrl: form.websiteUrl.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
        }),
      });

      if (!response.ok) {
        setSubmitError('Something went wrong. Please try again.');
        return;
      }

      router.push(`/book-service/access?orderId=${encodeURIComponent(orderId)}`);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!orderId) {
    return (
      <ConfirmDetailsPageShell>
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            Invalid link
          </h1>
          <p className="text-lg leading-[1.5] text-[#52525b]">
            Missing order information. Please return to your confirmation page.
          </p>
        </div>
      </ConfirmDetailsPageShell>
    );
  }

  return (
    <ConfirmDetailsPageShell>
      <h1 className="w-full text-center text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
        Before we start — does this look right?
      </h1>
      <p className="w-full text-center text-lg leading-[1.5] text-[#030712]">
        We pulled this from your audit and order. Tap any field to correct it
        — otherwise hit confirm and we&apos;ll get started.
      </p>

      {loading ? (
        <DetailsSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          {FIELD_CONFIG.map(({ field, label, type }) => (
            <div key={field} className="flex flex-col gap-2.5">
              <label
                htmlFor={field}
                className="text-left text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
              >
                {label}
              </label>
              <input
                id={field}
                type={type}
                value={form[field]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field]: e.target.value }))
                }
                disabled={submitting}
                className={INPUT_CLASS}
              />
            </div>
          ))}

          <PrimaryButton
            type="submit"
            disabled={!isComplete || submitting || isPreview}
            title={isPreview ? 'Disabled in preview mode' : undefined}
            className="w-full"
          >
            <CheckCircle2 className="size-6 shrink-0" aria-hidden="true" />
            {submitting ? 'Saving…' : 'Yes, this is correct'}
          </PrimaryButton>

          <p className="text-center text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
            Your info is only used to deliver your Site Fix. We don&apos;t share
            it.
          </p>

          {submitError ? (
            <p className="text-left text-sm font-semibold leading-[1.5] text-[#e7000b]">
              {submitError}
            </p>
          ) : null}
        </form>
      )}
    </ConfirmDetailsPageShell>
  );
}

export default function BookServiceConfirmDetailsPage() {
  return (
    <Suspense
      fallback={
        <ConfirmDetailsPageShell>
          <p className="text-center text-[#52525b]">Loading…</p>
        </ConfirmDetailsPageShell>
      }
    >
      <ConfirmDetailsContent />
    </Suspense>
  );
}
