'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import * as Sentry from '@sentry/nextjs';
import { stripePromise } from '@/lib/stripe';
import { UpdatePaymentMethodModal, PaymentMethodData } from './UpdatePaymentMethodModal';
import { useAuth } from '@/contexts/AuthContext';

interface UpdatePaymentMethodModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paymentData: PaymentMethodData) => Promise<void>;
}

export function UpdatePaymentMethodModalWrapper({ 
  isOpen, 
  onClose, 
  onSave 
}: UpdatePaymentMethodModalWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    const createSetupIntent = async () => {
      return Sentry.startSpan(
        {
          op: 'ui.action',
          name: 'Update Payment Method - Open Modal',
        },
        async (span) => {
          try {
            setLoading(true);

            // Set span attribute for userId if available
            if (user?.uid) {
              span.setAttribute('userId', user.uid);
            }

            const response = await fetch('/api/stripe/create-setup-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
              console.error('Failed to create setup intent:', response.status);
              throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.clientSecret) {
              setClientSecret(data.clientSecret);
            } else {
              console.error('No client secret returned');
            }
          } catch (error) {
            console.error('Error creating setup intent:', error);
            
            // Capture exception in Sentry
            Sentry.captureException(error, {
              tags: {
                component: 'UpdatePaymentMethodModal',
                action: 'openModal',
              },
              user: {
                id: user?.uid,
                email: user?.email || undefined,
              },
            });
          } finally {
            setLoading(false);
          }
        }
      );
    };

    createSetupIntent();
  }, [isOpen, user]);

  if (!isOpen) return null;

  if (loading || !clientSecret) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
        
        {/* Loading Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-[600px] p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9be382] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payment form...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#9be382',
            colorBackground: '#ffffff',
            colorText: '#232521',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
      }}
    >
      <UpdatePaymentMethodModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={onSave}
      />
    </Elements>
  );
}

