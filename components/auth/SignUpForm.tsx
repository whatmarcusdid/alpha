'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle, signInWithApple } from '@/lib/auth';
import { createUserWithSubscription, linkStripeCustomer } from '@/lib/firestore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GoogleIcon, AppleIcon } from '@/components/ui/icons';
import { Loader2 } from 'lucide-react';

const authInputClassName =
  'min-h-[40px] h-10 rounded-md border-[#d1d5db] px-5 py-2 text-sm text-[#030712] placeholder:text-[#52525b] focus-visible:ring-[#2920a5]';

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
      // Extract URL params for subscription data
      const searchParams = new URLSearchParams(window.location.search);
      const tier = searchParams.get('tier') || 'essential';
      const amount = searchParams.get('amount') || '0';
      const billingCycle = searchParams.get('billingCycle') || 'annual';

      // 1. Create user with Firebase Auth
      const user = await signUpWithEmail(email, password, name);
      
      // 2. Check for pending subscription FIRST (before creating user doc)
      let pendingSubscription = null;
      try {
        const response = await fetch('/api/stripe/claim-pending-subscription', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.subscription) {
            pendingSubscription = data.subscription;
            console.log('✅ Found pending subscription:', pendingSubscription);
          }
        }
      } catch (pendingError) {
        console.log('ℹ️ No pending subscription found (this is okay for new signups)');
      }
      
      // 3. Create user document with subscription data
      if (pendingSubscription) {
        // Use data from pending subscription (from Stripe webhook)
        await createUserWithSubscription(
          user.uid,
          user.email || email,
          name,
          {
            tier: pendingSubscription.tier as 'essential' | 'advanced' | 'premium',
            billingCycle: pendingSubscription.billingCycle === 'monthly' ? 'monthly' : 'yearly',
            amount: pendingSubscription.amount || parseFloat(amount),
            stripeCustomerId: pendingSubscription.stripeCustomerId,
            stripeSubscriptionId: pendingSubscription.stripeSubscriptionId,
          }
        );
      } else {
        // Fallback: No pending subscription found, create with URL params
        await createUserWithSubscription(
          user.uid,
          user.email || email,
          name,
          {
            tier: tier as 'essential' | 'advanced' | 'premium',
            billingCycle: billingCycle === 'monthly' ? 'monthly' : 'yearly',
            amount: parseFloat(amount),
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          }
        );
      }
      
      // 4. Send Growth Engine notifications (non-blocking)
      // These run in parallel for speed, errors don't block user flow

      const notificationPromises = [
        // 4a. Existing: New user Slack notification
        fetch('/api/notifications/new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email || email,
            displayName: name || user.displayName || 'New User',
            tier: (pendingSubscription?.tier || tier || 'essential') as 'essential' | 'advanced' | 'premium',
            billingCycle: ((pendingSubscription?.billingCycle || billingCycle) === 'annual'
              ? 'yearly'
              : (pendingSubscription?.billingCycle || billingCycle || 'yearly')) as 'monthly' | 'yearly',
            amount: pendingSubscription?.amount ?? parseFloat(amount || '0'),
          }),
        })
          .then(() => console.log('✅ New user Slack sent'))
          .catch((err) => console.error('⚠️ New user Slack failed:', err)),

        // 4b. Dashboard Ready email via Loops
        fetch('/api/notifications/dashboard-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email || email,
            firstName: (name || user.displayName || '').split(' ')[0] || 'there',
            planTier:
              (pendingSubscription?.tier || tier || 'essential').charAt(0).toUpperCase() +
              (pendingSubscription?.tier || tier || 'essential').slice(1),
          }),
        })
          .then(() => console.log('✅ Dashboard Ready email sent'))
          .catch((err) => console.error('⚠️ Dashboard Ready email failed:', err)),

        // 4c. Account Created Slack + Notion update
        fetch('/api/notifications/account-created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email || email,
            displayName: name || user.displayName || 'New User',
            tier: pendingSubscription?.tier || tier,
            billingCycle: pendingSubscription?.billingCycle || billingCycle,
          }),
        })
          .then(() => console.log('✅ Account Created notification sent'))
          .catch((err) => console.error('⚠️ Account Created notification failed:', err)),
      ];

      await Promise.allSettled(notificationPromises);
      console.log('✅ All Growth Engine notifications processed');

      // 5. Redirect to WordPress credentials page
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
      // Extract URL params for subscription data
      const searchParams = new URLSearchParams(window.location.search);
      const tier = searchParams.get('tier') || 'essential';
      const amount = searchParams.get('amount') || '0';
      const billingCycle = searchParams.get('billingCycle') || 'annual';

      // 1. Sign in with Google
      const user = await signInWithGoogle();
      
      // 2. Check for pending subscription FIRST (before creating user doc)
      let pendingSubscription = null;
      try {
        const response = await fetch('/api/stripe/claim-pending-subscription', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ email: (user.email || '').toLowerCase().trim() }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.subscription) {
            pendingSubscription = data.subscription;
            console.log('✅ Found pending subscription:', pendingSubscription);
          }
        }
      } catch (pendingError) {
        console.log('ℹ️ No pending subscription found (this is okay for new signups)');
      }
      
      // 3. Create user document with subscription data
      if (pendingSubscription) {
        // Use data from pending subscription (from Stripe webhook)
        await createUserWithSubscription(
          user.uid,
          user.email || '',
          user.displayName || 'Google User',
          {
            tier: pendingSubscription.tier as 'essential' | 'advanced' | 'premium',
            billingCycle: pendingSubscription.billingCycle === 'monthly' ? 'monthly' : 'yearly',
            amount: pendingSubscription.amount || parseFloat(amount),
            stripeCustomerId: pendingSubscription.stripeCustomerId,
            stripeSubscriptionId: pendingSubscription.stripeSubscriptionId,
          }
        );
      } else {
        // Fallback: No pending subscription found, create with URL params
        await createUserWithSubscription(
          user.uid,
          user.email || '',
          user.displayName || 'Google User',
          {
            tier: tier as 'essential' | 'advanced' | 'premium',
            billingCycle: billingCycle === 'monthly' ? 'monthly' : 'yearly',
            amount: parseFloat(amount),
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          }
        );
      }
      
      // 4. Send Growth Engine notifications (non-blocking)
      // These run in parallel for speed, errors don't block user flow

      const notificationPromises = [
        // 4a. Existing: New user Slack notification
        fetch('/api/notifications/new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Google User',
            tier: (pendingSubscription?.tier || tier || 'essential') as 'essential' | 'advanced' | 'premium',
            billingCycle: ((pendingSubscription?.billingCycle || billingCycle) === 'annual'
              ? 'yearly'
              : (pendingSubscription?.billingCycle || billingCycle || 'yearly')) as 'monthly' | 'yearly',
            amount: pendingSubscription?.amount ?? parseFloat(amount || '0'),
          }),
        })
          .then(() => console.log('✅ New user Slack sent'))
          .catch((err) => console.error('⚠️ New user Slack failed:', err)),

        // 4b. Dashboard Ready email via Loops
        fetch('/api/notifications/dashboard-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email || '',
            firstName: (user.displayName || 'Google User').split(' ')[0] || 'there',
            planTier:
              (pendingSubscription?.tier || tier || 'essential').charAt(0).toUpperCase() +
              (pendingSubscription?.tier || tier || 'essential').slice(1),
          }),
        })
          .then(() => console.log('✅ Dashboard Ready email sent'))
          .catch((err) => console.error('⚠️ Dashboard Ready email failed:', err)),

        // 4c. Account Created Slack + Notion update
        fetch('/api/notifications/account-created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Google User',
            tier: pendingSubscription?.tier || tier,
            billingCycle: pendingSubscription?.billingCycle || billingCycle,
          }),
        })
          .then(() => console.log('✅ Account Created notification sent'))
          .catch((err) => console.error('⚠️ Account Created notification failed:', err)),
      ];

      await Promise.allSettled(notificationPromises);
      console.log('✅ All Growth Engine notifications processed');

      // 5. Redirect to WordPress credentials page
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
      // Extract URL params for subscription data
      const searchParams = new URLSearchParams(window.location.search);
      const tier = searchParams.get('tier') || 'essential';
      const amount = searchParams.get('amount') || '0';
      const billingCycle = searchParams.get('billingCycle') || 'annual';

      // 1. Sign in with Apple
      const user = await signInWithApple();
      
      // 2. Check for pending subscription FIRST (before creating user doc)
      let pendingSubscription = null;
      try {
        const response = await fetch('/api/stripe/claim-pending-subscription', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ email: (user.email || '').toLowerCase().trim() }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.subscription) {
            pendingSubscription = data.subscription;
            console.log('✅ Found pending subscription:', pendingSubscription);
          }
        }
      } catch (pendingError) {
        console.log('ℹ️ No pending subscription found (this is okay for new signups)');
      }
      
      // 3. Create user document with subscription data
      if (pendingSubscription) {
        // Use data from pending subscription (from Stripe webhook)
        await createUserWithSubscription(
          user.uid,
          user.email || '',
          user.displayName || 'Apple User',
          {
            tier: pendingSubscription.tier as 'essential' | 'advanced' | 'premium',
            billingCycle: pendingSubscription.billingCycle === 'monthly' ? 'monthly' : 'yearly',
            amount: pendingSubscription.amount || parseFloat(amount),
            stripeCustomerId: pendingSubscription.stripeCustomerId,
            stripeSubscriptionId: pendingSubscription.stripeSubscriptionId,
          }
        );
      } else {
        // Fallback: No pending subscription found, create with URL params
        await createUserWithSubscription(
          user.uid,
          user.email || '',
          user.displayName || 'Apple User',
          {
            tier: tier as 'essential' | 'advanced' | 'premium',
            billingCycle: billingCycle === 'monthly' ? 'monthly' : 'yearly',
            amount: parseFloat(amount),
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          }
        );
      }
      
      // 4. Send Growth Engine notifications (non-blocking)
      // These run in parallel for speed, errors don't block user flow

      const notificationPromises = [
        // 4a. Existing: New user Slack notification
        fetch('/api/notifications/new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Apple User',
            tier: (pendingSubscription?.tier || tier || 'essential') as 'essential' | 'advanced' | 'premium',
            billingCycle: ((pendingSubscription?.billingCycle || billingCycle) === 'annual'
              ? 'yearly'
              : (pendingSubscription?.billingCycle || billingCycle || 'yearly')) as 'monthly' | 'yearly',
            amount: pendingSubscription?.amount ?? parseFloat(amount || '0'),
          }),
        })
          .then(() => console.log('✅ New user Slack sent'))
          .catch((err) => console.error('⚠️ New user Slack failed:', err)),

        // 4b. Dashboard Ready email via Loops
        fetch('/api/notifications/dashboard-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email || '',
            firstName: (user.displayName || 'Apple User').split(' ')[0] || 'there',
            planTier:
              (pendingSubscription?.tier || tier || 'essential').charAt(0).toUpperCase() +
              (pendingSubscription?.tier || tier || 'essential').slice(1),
          }),
        })
          .then(() => console.log('✅ Dashboard Ready email sent'))
          .catch((err) => console.error('⚠️ Dashboard Ready email failed:', err)),

        // 4c. Account Created Slack + Notion update
        fetch('/api/notifications/account-created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Apple User',
            tier: pendingSubscription?.tier || tier,
            billingCycle: pendingSubscription?.billingCycle || billingCycle,
          }),
        })
          .then(() => console.log('✅ Account Created notification sent'))
          .catch((err) => console.error('⚠️ Account Created notification failed:', err)),
      ];

      await Promise.allSettled(notificationPromises);
      console.log('✅ All Growth Engine notifications processed');

      // 5. Redirect to WordPress credentials page
      router.push(`/checkout/wordpress-credentials?tier=${tier}&amount=${amount}&billingCycle=${billingCycle}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <div className="flex w-full max-w-[500px] flex-col gap-6">
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-[40px] font-bold leading-[1.2] tracking-[-0.4px] text-[#232521]">
          Create New Account
        </h1>
        <p className="text-lg leading-[1.5] text-[#030712]">
          Create your account to unlock access to your dashboard securely access your
          services.
        </p>
      </div>

      <form onSubmit={handleEmailSignUp} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="name" className="text-sm font-semibold text-[#030712]">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            disabled={loading}
            className={authInputClassName}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <Label htmlFor="email" className="text-sm font-semibold text-[#030712]">
            Email
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
          <Label htmlFor="password" className="text-sm font-semibold text-[#030712]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
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
          {loading && !ssoLoading ? 'Creating account…' : 'Create New Account'}
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
          onClick={() => void handleGoogleSignUp()}
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
          onClick={() => void handleAppleSignUp()}
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
