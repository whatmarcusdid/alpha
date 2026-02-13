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
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          subtitle: 'If an account exists for this email, you will receive password reset instructions shortly.',
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
    } catch (err) {
      console.error('Password reset request error:', err);
      trackPasswordResetFailed(err instanceof Error ? err.message : 'Unknown error');
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
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[#232521]">
            {emailSent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className="text-base text-[#545552]">
            {emailSent
              ? 'If an account exists with this email, you will receive password reset instructions shortly.'
              : 'Enter your email address and we will send you instructions to reset your password.'}
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-6 pt-6" aria-label="Password reset form">
            <div className="space-y-2 text-left">
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ email: e.target.value })}
                required
                autoComplete="email"
                disabled={loading}
                className="min-h-[40px]"
                aria-label="Email address for password reset"
                aria-describedby="email-help"
                aria-required="true"
              />
              <p id="email-help" className="text-sm text-gray-600">
                Enter the email address associated with your account
              </p>
            </div>

            <div className="space-y-3">
              <PrimaryButton
                type="submit"
                disabled={loading}
                className="w-full min-h-[40px]"
                aria-busy={loading}
              >
                {loading ? 'Sending...' : 'Send reset instructions'}
              </PrimaryButton>

              <Link href="/signin" className="block">
                <SecondaryButton className="w-full min-h-[40px]">
                  Back to sign in
                </SecondaryButton>
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-6 pt-6" role="status" aria-live="polite">
            <div className="space-y-3">
              <Link href="/signin" className="block">
                <PrimaryButton className="w-full min-h-[40px]">
                  Back to sign in
                </PrimaryButton>
              </Link>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setFormData({ email: '' });
                }}
                className="w-full text-sm text-[#545552] hover:text-[#232521] transition-colors"
              >
                Try a different email
              </button>
            </div>
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
