'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordReset } from '@/lib/auth';
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
    
    // Client-side validation
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

    try {
      // Track password reset attempt
      trackPasswordResetRequested('email');

      const result = await sendPasswordReset(formData.email);

      // Always show success message (security: don't reveal if email exists)
      setEmailSent(true);
      setToast({
        show: true,
        type: 'success',
        message: 'Check your email',
        subtitle: 'If an account exists with this email, you will receive password reset instructions.',
      });

      // Track successful request
      trackPasswordResetEmailSent();
    } catch (error: any) {
      // Track failure
      trackPasswordResetFailed(error?.message || 'Unknown error');

      // Handle specific error cases
      let errorMessage = 'Unable to send reset email';
      let errorSubtitle = 'Please try again in a few moments.';

      if (error?.message?.includes('network') || error?.message?.includes('Network')) {
        errorMessage = 'Network error';
        errorSubtitle = 'Please check your internet connection and try again.';
      } else if (error?.message?.includes('too-many-requests')) {
        errorMessage = 'Too many attempts';
        errorSubtitle = 'Please wait a few minutes before trying again.';
      }

      setToast({
        show: true,
        type: 'error',
        message: errorMessage,
        subtitle: errorSubtitle,
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
              : 'Enter your email address and we'll send you instructions to reset your password.'}
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ email: e.target.value })}
                required
                autoComplete="email"
                disabled={loading}
                className="min-h-[40px]"
              />
            </div>

            <div className="space-y-3">
              <PrimaryButton
                type="submit"
                disabled={loading}
                className="w-full min-h-[40px]"
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
          <div className="space-y-6 pt-6">
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
