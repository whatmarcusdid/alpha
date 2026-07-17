'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { signInWithCustomToken } from '@/lib/auth';
import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import { AppleIcon, GoogleIcon } from '@/components/ui/icons';

type FormState = {
  email: string;
  password: string;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

const INPUT_CLASS =
  'flex h-[40px] min-h-[40px] w-full rounded-[6px] border border-[rgba(111,121,122,0.4)] bg-white px-5 py-3 text-sm tracking-[-0.14px] text-[#030712] placeholder:text-[#52525b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2920A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function mapCreateAccountError(status: number, message: string): string {
  if (status === 403) {
    return "The email you entered doesn't match the one used for this purchase. Please use the email address from your order confirmation.";
  }

  if (status === 409) {
    if (message.toLowerCase().includes('already been claimed')) {
      return 'This order has already been claimed. If this is your order, try signing in.';
    }
    if (message.toLowerCase().includes('already exists')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    return message;
  }

  if (status === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (status >= 500 || status === 0) {
    return 'Something went wrong. Please try again or contact support.';
  }

  return message || 'Something went wrong. Please try again or contact support.';
}

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  if (!orderId) {
    return (
      <div className="relative flex min-h-screen flex-col bg-slate-50">
        <div className="absolute left-6 top-10 z-10 md:left-10">
          <BookServiceHeader variant="inline" />
        </div>
        <main className="mx-auto flex w-full max-w-[500px] flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            Invalid signup link.
          </h1>
          <p className="text-lg leading-[1.5] text-[#030712]">
            Invalid signup link. Please return to your confirmation page.
          </p>
          <PrimaryButton href="/book-service/confirmation" className="w-full">
            Return to confirmation
          </PrimaryButton>
        </main>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const errors = validateForm(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/book-service/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          orderId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const apiMessage =
        typeof payload.error === 'string' ? payload.error : '';

      if (!response.ok) {
        setSubmitError(mapCreateAccountError(response.status, apiMessage));
        return;
      }

      const customToken = payload?.data?.customToken as string | undefined;
      if (!customToken) {
        setSubmitError(
          'Something went wrong. Please try again or contact support.'
        );
        return;
      }

      await signInWithCustomToken(customToken);
      router.push(
        `/book-service/confirm-details?orderId=${encodeURIComponent(orderId)}`
      );
    } catch {
      setSubmitError(
        'Something went wrong. Please try again or contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSsoUnavailable = () => {
    setSubmitError(
      'To claim your Site Fix order, please create an account with the email address from your purchase confirmation.'
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50">
      <div className="absolute left-6 top-10 z-10 md:left-10">
        <BookServiceHeader variant="inline" />
      </div>
      <main className="mx-auto flex w-full max-w-[500px] flex-1 flex-col items-center gap-6 px-6 pb-[120px] pt-[120px] md:px-0">
        <div className="flex w-full flex-col items-center gap-6 text-center">
          <h1 className="w-full text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            Create New Account
          </h1>
          <p className="w-full text-lg leading-[1.5] text-[#030712]">
            Create your account to track your fix, access your dashboard, and
            securely manage your services.
          </p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="email"
              className="text-left text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, email: e.target.value }));
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              disabled={loading}
              className={INPUT_CLASS}
            />
            {fieldErrors.email ? (
              <p className="text-left text-sm font-semibold leading-[1.5] text-[#e7000b]">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2.5">
              <label
                htmlFor="password"
                className="text-left text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, password: e.target.value }));
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                disabled={loading}
                className={INPUT_CLASS}
              />
              {fieldErrors.password ? (
                <p className="text-left text-sm font-semibold leading-[1.5] text-[#e7000b]">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>
            <Link
              href="/forgot-password"
              className="text-left text-base font-bold leading-[1.5] text-[#2920A5] hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating your account…' : 'Create New Account'}
          </PrimaryButton>

          {submitError ? (
            <p className="text-left text-sm font-semibold leading-[1.5] text-[#e7000b]">
              {submitError}
            </p>
          ) : null}

          <div className="flex w-full items-center gap-4">
            <div className="h-px flex-1 bg-[rgba(111,121,122,0.4)]" aria-hidden="true" />
            <span className="text-sm leading-[1.5] tracking-[-0.14px] text-[#232521]">
              Or
            </span>
            <div className="h-px flex-1 bg-[rgba(111,121,122,0.4)]" aria-hidden="true" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSsoUnavailable}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[rgba(0,0,0,0.16)] bg-white px-6 py-[10px] text-base font-bold leading-[1.5] text-[#052326] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon className="size-6 shrink-0" aria-hidden="true" />
            Continue with Google
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSsoUnavailable}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[rgba(0,0,0,0.16)] bg-black px-6 py-[10px] text-base font-bold leading-[1.5] text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AppleIcon className="size-6 shrink-0 text-white" aria-hidden="true" />
            Continue with Apple
          </button>
        </form>
      </main>
    </div>
  );
}

export default function BookServiceSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen flex-col bg-slate-50">
          <div className="absolute left-6 top-10 z-10 md:left-10">
            <BookServiceHeader variant="inline" />
          </div>
          <main className="mx-auto flex w-full max-w-[500px] flex-1 items-center justify-center px-6 py-16">
            <p className="text-[#52525b]">Loading…</p>
          </main>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
