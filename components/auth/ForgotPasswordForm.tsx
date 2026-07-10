'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  trackPasswordResetRequested,
  trackPasswordResetEmailSent,
  trackPasswordResetFailed,
} from '@/lib/analytics';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NotificationToast } from '@/components/ui/NotificationToast';

type ForgotPasswordFormData = {
  email: string;
};

type ToastState = {
  show: boolean;
  type: 'success' | 'error';
  message: string;
  subtitle?: string;
};

const authInputClassName =
  'min-h-[40px] h-10 rounded-md border-[#d1d5db] px-5 py-2 text-sm text-[#030712] placeholder:text-[#52525b] focus-visible:ring-[#2920a5]';

export function ForgotPasswordForm() {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({ email: '' });
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'success',
    message: '',
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.email.trim()) {
      setToast({
        show: true,
        type: 'error',
        message: 'Email address is required',
      });
      return;
    }

    if (!validateEmail(formData.email)) {
      setToast({
        show: true,
        type: 'error',
        message: 'Please enter a valid email address',
      });
      return;
    }

    setLoading(true);
    setToast({ ...toast, show: false });

    try {
      trackPasswordResetRequested('email');

      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSent(true);
        setToast({
          show: true,
          type: 'success',
          message: 'Check your email',
          subtitle:
            'If an account exists for this email, you will receive password reset instructions shortly.',
        });
        trackPasswordResetEmailSent();
      } else {
        trackPasswordResetFailed(data.error || 'Unknown error');
        setToast({
          show: true,
          type: 'error',
          message: data.error || 'Unable to send reset email. Please try again.',
        });
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      trackPasswordResetFailed(error instanceof Error ? error.message : 'Unknown error');
      setToast({
        show: true,
        type: 'error',
        message: 'An error occurred. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex w-full max-w-[500px] flex-col gap-6">
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-[40px] font-bold leading-[1.2] tracking-[-0.4px] text-[#030712]">
            {emailSent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className="text-lg leading-[1.5] text-[#030712]">
            {emailSent
              ? 'If an account exists with this email, you will receive password reset instructions shortly.'
              : 'Enter your email address and we will send you instructions to reset your password.'}
          </p>
        </div>

        {!emailSent ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
            aria-label="Password reset form"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="reset-email" className="text-sm font-semibold text-[#030712]">
                  Email address
                </Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(event) => setFormData({ email: event.target.value })}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className={authInputClassName}
                  aria-label="Email address for password reset"
                  aria-describedby="email-help"
                  aria-required="true"
                />
              </div>
              <p id="email-help" className="text-xs leading-[1.5] text-[#52525b]">
                Enter the email address associated with your account
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#2920a5] px-6 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#241a94] disabled:cursor-not-allowed disabled:opacity-50"
                aria-busy={loading}
              >
                {loading ? 'Sending…' : 'Send reset instructions'}
              </button>

              <Link
                href="/signin"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border-[3px] border-[#2920a5] bg-white px-6 py-2.5 text-base font-semibold text-[#2920a5] transition-colors hover:bg-[#f5f3ff]"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-6" role="status" aria-live="polite">
            <Link
              href="/signin"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#2920a5] px-6 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#241a94]"
            >
              Back to sign in
            </Link>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setFormData({ email: '' });
              }}
              className="text-sm text-[#52525b] transition-colors hover:text-[#030712]"
            >
              Try a different email
            </button>
          </div>
        )}
      </div>

      <NotificationToast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        subtitle={toast.subtitle}
        onDismiss={() => setToast({ ...toast, show: false })}
      />
    </>
  );
}
