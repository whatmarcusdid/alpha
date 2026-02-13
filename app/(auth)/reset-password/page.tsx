'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
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
          setIsValid(true);
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

    validate();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#9be382] border-t-transparent" />
        <p className="mt-4 text-[#6F797A]">Validating reset link...</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#232521]">Invalid Reset Link</h1>
          <p className="text-[#6F797A]">{validationError}</p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex w-full min-h-[40px] items-center justify-center rounded-full bg-[#9be382] px-6 py-3 font-semibold text-[#232521] transition-colors hover:bg-[#8dd370]"
        >
          Request New Reset
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#232521]">Password Reset Successfully!</h1>
          <p className="text-[#6F797A]">Redirecting you to login...</p>
        </div>
        <Link
          href="/signin"
          className="inline-flex w-full min-h-[40px] items-center justify-center rounded-full bg-[#9be382] px-6 py-3 font-semibold text-[#232521] transition-colors hover:bg-[#8dd370]"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-[#232521]">Set your new password</h1>
        <p className="text-sm text-[#6F797A]">
          Enter a new password for {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#232521]">
            New Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            disabled={submitting}
            className="min-h-[40px] border-[#6F797A] focus:ring-[#1B4332]"
          />
          {password.length > 0 && password.length < 8 && (
            <p className="text-sm text-red-600">Password must be at least 8 characters</p>
          )}
          {password.length >= 8 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strength.segmentFillColor : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-sm font-medium ${strength.labelColor}`}>{strength.label}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-[#232521]">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
            className="min-h-[40px] border-[#6F797A] focus:ring-[#1B4332]"
          />
          {confirmPassword.length > 0 && (
            <p className={`text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full min-h-[40px] rounded-full px-6 py-3 font-semibold transition-colors ${
              canSubmit
                ? 'bg-[#9be382] text-[#232521] hover:bg-[#8dd370]'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            }`}
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>

          <Link
            href="/signin"
            className="block text-center text-sm text-[#6F797A] hover:text-[#232521] transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full bg-[#faf9f5] flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-12 md:px-10 md:py-16 lg:py-28">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#9be382] border-t-transparent" />
              <p className="mt-4 text-[#6F797A]">Loading...</p>
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </main>
    </div>
  );
}
