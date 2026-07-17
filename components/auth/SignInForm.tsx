'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import {
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  handleRedirectResult,
} from '@/lib/auth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppleIcon, GoogleIcon } from '@/components/ui/icons';

const authInputClassName =
  'min-h-[40px] h-10 rounded-md border-[#d1d5db] px-5 py-2 text-sm text-[#030712] placeholder:text-[#52525b] focus-visible:ring-[#2920a5]';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const user = await handleRedirectResult();
        if (user) {
          router.push('/dashboard');
        }
      } catch (redirectError: unknown) {
        const message =
          redirectError instanceof Error
            ? redirectError.message
            : 'Unable to complete sign in.';
        setError(message);
      }
    };

    void checkRedirectResult();
  }, [router]);

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmail(email, password);
      router.push('/dashboard');
    } catch (signInError: unknown) {
      const message =
        signInError instanceof Error ? signInError.message : 'Unable to sign in.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setSsoLoading('google');
    setError(null);
    signInWithGoogle().catch((signInError: Error) => {
      setError(signInError.message);
      setSsoLoading(null);
    });
  };

  const handleAppleSignIn = () => {
    setSsoLoading('apple');
    setError(null);
    signInWithApple().catch((signInError: Error) => {
      setError(signInError.message);
      setSsoLoading(null);
    });
  };

  return (
    <div className="flex w-full max-w-[500px] flex-col gap-6">
      <h1 className="text-center text-[40px] font-bold leading-[1.2] tracking-[-0.4px] text-[#030712]">
        Sign in to your account
      </h1>

      <form onSubmit={handleEmailSignIn} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="email" className="text-sm font-semibold text-[#030712]">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            className={authInputClassName}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-sm font-semibold text-[#030712]">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm text-[#52525b] hover:text-[#030712]"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
            className={authInputClassName}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PrimaryButton type="submit" disabled={loading} className="w-full min-h-[44px]">
          {loading ? 'Signing in…' : 'Sign In'}
        </PrimaryButton>
      </form>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-[#d1d5db]" />
        <span className="text-sm text-[#030712]">Or</span>
        <div className="h-px flex-1 bg-[#d1d5db]" />
      </div>

      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || ssoLoading === 'apple'}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-6 py-2.5 text-base font-bold text-[#030712] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ssoLoading === 'google' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="h-6 w-6" />
          )}
          Continue with Google
        </button>

        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={loading || ssoLoading === 'google'}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#d1d5db] bg-[#030712] px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ssoLoading === 'apple' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <AppleIcon className="h-6 w-6" />
          )}
          Continue with Apple
        </button>
      </div>
    </div>
  );
}
