'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle, signInWithApple } from '@/lib/auth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GoogleIcon, AppleIcon } from '@/components/ui/icons';
import { Loader2 } from 'lucide-react';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'google' | 'apple' | null>(null);

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await signUpWithEmail(email, password, name);
      await setDoc(doc(collection(db, 'users'), user.uid), {
        email: user.email,
        fullName: name,
        createdAt: serverTimestamp(),
        subscription: {
          tier: 'monthly',
          status: 'inactive'
        },
        stats: {
          websiteTraffic: 0,
          siteSpeedSeconds: 0,
          supportHoursRemaining: 10,
          maintenanceHoursRemaining: 10
        }
      });
      
      // Get query params and redirect to WordPress credentials
      const searchParams = new URLSearchParams(window.location.search);
      const tier = searchParams.get('tier') || 'essential';
      const amount = searchParams.get('amount') || '0';
      const billingCycle = searchParams.get('billingCycle') || 'annual';
      router.push(`/checkout/wordpress-credentials?tier=${tier}&amount=${amount}&billingCycle=${billingCycle}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setSsoLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
      
      // Get query params and redirect to WordPress credentials
      const searchParams = new URLSearchParams(window.location.search);
      const tier = searchParams.get('tier') || 'essential';
      const amount = searchParams.get('amount') || '0';
      const billingCycle = searchParams.get('billingCycle') || 'annual';
      router.push(`/checkout/wordpress-credentials?tier=${tier}&amount=${amount}&billingCycle=${billingCycle}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSsoLoading(null);
    }
  };

  const handleAppleSignUp = async () => {
    setSsoLoading('apple');
    setError(null);
    try {
      await signInWithApple();
      
      // Get query params and redirect to WordPress credentials
      const searchParams = new URLSearchParams(window.location.search);
      const tier = searchParams.get('tier') || 'essential';
      const amount = searchParams.get('amount') || '0';
      const billingCycle = searchParams.get('billingCycle') || 'annual';
      router.push(`/checkout/wordpress-credentials?tier=${tier}&amount=${amount}&billingCycle=${billingCycle}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Heading Section */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Create New Account</h1>
        <p className="text-base text-gray-600 leading-relaxed">
          Create your account to unlock access to your dashboard securely access your services.
        </p>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleEmailSignUp} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold text-gray-900">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg min-h-[40px]"
          />
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-gray-900">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg min-h-[40px]"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-semibold text-gray-900">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg min-h-[40px]"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Create Account Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#9be382] hover:bg-[#8cd370] text-[#1b4a41] font-semibold rounded-full"
        >
          {loading && !ssoLoading ? 'Creating account...' : 'Create New Account'}
        </Button>
      </form>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#faf9f5] px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {/* SSO Buttons */}
      <div className="space-y-3">
        {/* Google Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full py-3 bg-white border border-gray-300 text-gray-900 rounded-full"
        >
          {ssoLoading === 'google' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-5 w-5" />
          )}
          Continue with Google
        </Button>

        {/* Apple Button */}
        <Button
          type="button"
          onClick={handleAppleSignUp}
          disabled={loading}
          className="w-full py-3 bg-black hover:bg-gray-900 text-white rounded-full"
        >
          {ssoLoading === 'apple' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <AppleIcon className="mr-2 h-5 w-5" />
          )}
          Continue with Apple
        </Button>
      </div>
    </div>
  );
}
