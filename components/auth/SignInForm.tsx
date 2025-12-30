'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  handleRedirectResult,
} from '@/lib/auth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppleIcon, GoogleIcon } from '@/components/ui/icons';
import { Loader2 } from 'lucide-react';
import { PrimaryButton } from "@/components/ui/PrimaryButton";

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
      } catch (error: any) {
        setError(error.message);
      }
    };
    checkRedirectResult();
  }, [router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setSsoLoading('google');
    setError(null);
    signInWithGoogle().catch((error) => {
      setError(error.message);
      setSsoLoading(null);
    });
  };

  const handleAppleSignIn = () => {
    setSsoLoading('apple');
    setError(null);
    signInWithApple().catch((error) => {
      setError(error.message);
      setSsoLoading(null);
    });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-[#232521]">Sign in to your account</h1>
      </div>
      <form onSubmit={handleEmailSignIn} className="space-y-4 pt-6">
        <div className="space-y-2 text-left">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PrimaryButton
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </PrimaryButton>
      </form>

      <div className="relative pt-2">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-[0.7rem] uppercase">
          <span className="bg-[#faf9f5] px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading || ssoLoading === 'apple'}
          className="w-full h-11 bg-white border border-[#747775] text-[#1F1F1F] text-sm font-medium rounded-[360px] flex items-center justify-center px-4 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {ssoLoading === 'google' ? (
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="mr-3 h-5 w-5" />
          )}
          Sign in with Google
        </Button>

        <Button
          onClick={handleAppleSignIn}
          disabled={loading || ssoLoading === 'google'}
          className="w-full h-11 bg-black text-white text-sm font-medium rounded-[360px] flex items-center justify-center px-4 hover:bg-gray-800 active:bg-gray-900 disabled:opacity-50 transition-colors"
        >
          {ssoLoading === 'apple' ? (
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <AppleIcon className="mr-3 h-5 w-5" />
          )}
          Sign in with Apple
        </Button>
      </div>
    </div>
  );
}
