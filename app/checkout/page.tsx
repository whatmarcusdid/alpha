'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise, PRICING, PricingTier, BillingCycle, getPrice, getRenewalDate } from '@/lib/stripe';
import CheckoutForm from '@/components/CheckoutForm';
import { PageCard } from '@/components/ui/PageCard';
import { Header } from '@/components/layout/Header';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = (searchParams.get('tier') as PricingTier) || 'essential';
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const planData = PRICING[tier];
  
  const subtotal = getPrice(tier, billingCycle);
  const taxRate = 0.06;
  const taxes = subtotal * taxRate;
  const total = subtotal + taxes;

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          'https://us-central1-tradesitegenie.cloudfunctions.net/createPaymentIntent',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: total,
              tier,
              billingCycle,
            }),
          }
        );

        const data = await response.json();
        
        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          console.error('Failed to create payment intent:', data);
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [total, tier, billingCycle]);

  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageCard>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-[#232521] mb-8">Checkout</h1>

              <div className="rounded-lg border border-gray-200 p-4 mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#232521]">
                    Genie Maintenance - {planData.name} Plan
                  </h3>
                  <p className="text-sm text-gray-600">
                    Plan renews on {getRenewalDate(billingCycle)}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/pricing')}
                  className="text-sm text-gray-600 hover:text-[#232521]"
                  aria-label="Remove plan"
                >
                  🗑️
                </button>
              </div>

              {loading ? (
                <div className="rounded-lg border border-gray-200 p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9be382] mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading payment form...</p>
                </div>
              ) : clientSecret ? (
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
                  <CheckoutForm
                    amount={total}
                    tier={tier}
                    billingCycle={billingCycle}
                  />
                </Elements>
              ) : (
                <div className="rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-red-600">Failed to load payment form. Please refresh the page.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-[#FAF9F5] rounded-lg border border-gray-200 p-6 sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#232521]">Order Summary</h2>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="text-sm text-[#232521] hover:underline"
                  >
                    Go Back
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-[#232521]">
                        Genie Maintenance - {planData.name} Plan (Plan renews on {getRenewalDate(billingCycle)})
                      </p>
                      <p className="text-sm text-gray-600">${subtotal.toFixed(2)}</p>
                    </div>
                  </div>

                  {planData.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="ml-3 text-sm text-gray-600">{feature}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="font-semibold text-[#232521] mb-3">Deliverables</h3>
                  <div className="space-y-2">
                    {planData.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-start">
                        <span className="text-[#232521] mr-2">↗</span>
                        <p className="text-sm text-gray-600">{deliverable}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-[#232521]">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxes</span>
                    <span className="font-medium text-[#232521]">${taxes.toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-3">
                    <label className="block text-sm font-medium text-[#232521] mb-2">
                      Promo Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter code here"
                      className="w-full min-h-[40px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
                    <span className="text-[#232521]">Total Due Today</span>
                    <span className="text-[#232521]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageCard>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F6F1] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9be382]"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
