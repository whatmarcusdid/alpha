'use client';

import { BookServiceLogoLink } from '@/lib/book-service/BookServiceHeader';
import type { AccessRequestPageState } from '@/lib/site-access/client/access-request-page-logic';

type AccessRequestStatusCardProps = {
  variant: 'grant' | 'decline';
  state: AccessRequestPageState;
  expiresAt?: string | null;
  formattedExpiresAt?: string;
};

function GrantContent({
  state,
  formattedExpiresAt,
}: {
  state: AccessRequestPageState;
  formattedExpiresAt?: string;
}) {
  if (state === 'loading') {
    return (
      <>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1d4ed8] border-t-transparent" />
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          Confirming your access link…
        </p>
      </>
    );
  }

  if (state === 'success') {
    return (
      <>
        <p className="text-center text-2xl font-bold leading-[1.3] text-[#030712]">
          ✓ Access confirmed
        </p>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          Thank you — we&apos;ve received your access and will continue your Site Fix
          shortly.
        </p>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          You can close this window.
        </p>
        {formattedExpiresAt ? (
          <p className="text-center text-sm leading-[1.5] text-[#737373]">
            Your access link expires on {formattedExpiresAt}.
          </p>
        ) : null}
      </>
    );
  }

  if (state === 'already_used') {
    return (
      <>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          This access link has already been used or is no longer valid.
        </p>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          If you think this is a mistake, please reply to the email you received from
          us.
        </p>
      </>
    );
  }

  if (state === 'expired') {
    return (
      <>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          This access link has expired.
        </p>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          Please contact us and we&apos;ll send you a new one.
        </p>
      </>
    );
  }

  if (state === 'missing_token') {
    return (
      <p className="text-center text-lg leading-[1.5] text-[#52525b]">
        This access link is missing or invalid. Please use the link from your email.
      </p>
    );
  }

  return (
    <>
      <p className="text-center text-lg leading-[1.5] text-[#52525b]">
        Something went wrong confirming your access.
      </p>
      <p className="text-center text-lg leading-[1.5] text-[#52525b]">
        Please try again or reply to the email you received from us.
      </p>
    </>
  );
}

function DeclineContent({ state }: { state: AccessRequestPageState }) {
  if (state === 'loading') {
    return (
      <>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1d4ed8] border-t-transparent" />
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          Processing your response…
        </p>
      </>
    );
  }

  if (state === 'success') {
    return (
      <>
        <p className="text-center text-2xl font-bold leading-[1.3] text-[#030712]">
          Got it — we&apos;ll be in touch.
        </p>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          We&apos;ve noted that you&apos;re not able to share access right now. Someone
          from our team will follow up with you shortly.
        </p>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          You can close this window.
        </p>
      </>
    );
  }

  if (state === 'already_used' || state === 'expired' || state === 'missing_token') {
    return (
      <>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          This access link has already been used or is no longer valid.
        </p>
        <p className="text-center text-lg leading-[1.5] text-[#52525b]">
          If you think this is a mistake, please reply to the email you received from
          us.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-center text-lg leading-[1.5] text-[#52525b]">
        Something went wrong processing your response.
      </p>
      <p className="text-center text-lg leading-[1.5] text-[#52525b]">
        Please try again or reply to the email you received from us.
      </p>
    </>
  );
}

export function AccessRequestPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col items-center gap-12 px-6 pb-[120px] pt-10 md:px-[140px]">
        <div className="w-full">
          <BookServiceLogoLink variant="large" />
        </div>
        <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AccessRequestStatusCard({
  variant,
  state,
  formattedExpiresAt,
}: AccessRequestStatusCardProps) {
  return variant === 'grant' ? (
    <GrantContent state={state} formattedExpiresAt={formattedExpiresAt} />
  ) : (
    <DeclineContent state={state} />
  );
}
