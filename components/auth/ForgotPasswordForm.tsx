'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendPasswordReset } from '@/lib/auth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [formState, setFormState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setFormState({ status: 'loading', message: '' });

    const result = await sendPasswordReset(data.email);

    if (result.success) {
      setFormState({ status: 'success', message: 'If an account exists, a password reset link has been sent.' });
    } else {
      setFormState({ status: 'error', message: result.error || 'An unexpected error occurred.' });
    }
  }

  return (
    <div className="max-w-md w-full space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#232521]">Reset your password</h1>
        <p className="text-gray-600 mt-2">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {(formState.status === 'success' || formState.status === 'error') && (
        <Alert variant={formState.status === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{formState.message}</AlertDescription>
        </Alert>
      )}

      {formState.status !== 'success' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="name@example.com"
              className="mt-1"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <PrimaryButton
            type="submit"
            className="w-full"
            disabled={formState.status === 'loading'}
          >
            {formState.status === 'loading' ? 'Sending...' : 'Send reset link'}
          </PrimaryButton>
        </form>
      )}

      <div className="text-center">
        <TertiaryButton href="/signin" className="w-full">
          Back to sign in
        </TertiaryButton>
      </div>
    </div>
  );
}
