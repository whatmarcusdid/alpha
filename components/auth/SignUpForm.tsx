'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle, signInWithApple } from '@/lib/auth';
import { createUserWithSubscription, linkStripeCustomer } from '@/lib/firestore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GoogleIcon, AppleIcon } from '@/components/ui/icons';
import { Loader2 } from 'lucide-react';

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
