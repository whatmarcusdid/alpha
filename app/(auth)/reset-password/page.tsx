'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

const authInputClassName =
  'min-h-[40px] h-10 rounded-md border-[#d1d5db] px-5 py-2 text-sm text-[#030712] placeholder:text-[#52525b] focus-visible:ring-[#2920A5]';

const secondaryButtonClassName =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border-[3px] border-[#2920a5] bg-white px-6 py-2.5 text-base font-semibold text-[#2920a5] transition-colors hover:bg-[#f5f3ff]';

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  labelColor: string;
  segmentFillColor: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    return { score, label: 'Weak', labelColor: 'text-red-600', segmentFillColor: 'bg-red-500' };
  }
  if (score <= 4) {
    return { score, label: 'Medium', labelColor: 'text-amber-600', segmentFillColor: 'bg-amber-500' };
  }
  return { score, label: 'Strong', labelColor: 'text-green-600', segmentFillColor: 'bg-green-500' };
}

function ErrorIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2]">
      <svg
        className="h-8 w-8 text-red-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

function SuccessIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
      <svg
        className="h-8 w-8 text-green-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2920a5] border-t-transparent" />
      <p className="mt-4 text-base text-[#52525b]">{message}</p>
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setValidationError('No reset token provided. Please use the link from your email.');
      setLoading(false);
      return;
    }

    const validate = async () => {
      try {
        const response = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();

        if (data.valid) {
          setEmail(data.email);
        } else {
          setValidationError(data.error ?? 'Invalid reset link.');
        }
      } catch {
        setValidationError('Failed to validate reset link. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void validate();
  }, [token]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.push('/signin'), 3000);
    return () => clearTimeout(timer);
  }, [success, router]);

  const strength = getPasswordStrength(password);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = passwordValid && passwordsMatch && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !token) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
      } else {
        setSubmitError(data.error ?? 'Failed to reset password. Please try again.');
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Validating reset link…" />;
  }

  if (validationError) {
    return (
      <div className="flex w-full max-w-[500px] flex-col items-center gap-6 text-center">
        <ErrorIcon />
        <h1 className="text-[40px] font-bold leading-[1.2] tracking-[-0.4px] text-[#030712]">
          Invalid Reset Link
        </h1>
        <p className="text-lg leading-[1.5] text-[#030712]">{validationError}</p>
        <PrimaryButton href="/forgot-password" className="w-full min-h-[44px] font-semibold">
          Request New Reset
        </PrimaryButton>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex w-full max-w-[500px] flex-col items-center gap-6 text-center">
        <SuccessIcon />
        <h1 className="text-[40px] font-bold leading-[1.2] tracking-[-0.4px] text-[#030712]">
          Password reset successfully
        </h1>
        <p className="text-lg leading-[1.5] text-[#030712]">Redirecting you to sign in…</p>
        <PrimaryButton href="/signin" className="w-full min-h-[44px] font-semibold">
          Go to sign in
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[500px] flex-col gap-6">
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-[40px] font-bold leading-[1.2] tracking-[-0.4px] text-[#030712]">
          Set your new password
        </h1>
        <p className="text-lg leading-[1.5] text-[#030712]">
          Enter a new password for {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="password" className="text-sm font-semibold text-[#030712]">
            New password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            autoComplete="new-password"
            disabled={submitting}
            className={authInputClassName}
          />
          {password.length > 0 && password.length < 8 && (
            <p className="text-sm text-red-600">Password must be at least 8 characters</p>
          )}
          {password.length >= 8 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index < strength.score ? strength.segmentFillColor : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-sm font-medium ${strength.labelColor}`}>{strength.label}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#030712]">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            disabled={submitting}
            className={authInputClassName}
          />
          {confirmPassword.length > 0 && (
            <p className={`text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex flex-col gap-6">
          <PrimaryButton
            type="submit"
            disabled={!canSubmit}
            className="w-full min-h-[44px] font-semibold"
          >
            {submitting ? 'Resetting…' : 'Reset password'}
          </PrimaryButton>

          <Link href="/signin" className={secondaryButtonClassName}>
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout>
      <Suspense fallback={<LoadingState message="Loading…" />}>
        <ResetPasswordContent />
      </Suspense>
    </AuthPageLayout>
  );
}
