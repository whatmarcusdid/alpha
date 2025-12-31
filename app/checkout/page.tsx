'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise, PRICING, PricingTier, BillingCycle, getPrice, getRenewalDate } from '@/lib/stripe';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import { PageCard } from '@/components/layout/PageCard';
import { Header } from '@/components/layout/Header';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SelectedProductCard } from '@/components/checkout/SelectedProductCard';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = (searchParams.get('tier') as PricingTier) || 'essential';
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [renewalDate, setRenewalDate] = useState<string>(''); // ADD THIS

  const planData = PRICING[tier];
  
  const subtotal = getPrice(tier, billingCycle);
  const taxRate = 0.06;
  const taxes = subtotal * taxRate;
  const total = subtotal + taxes;

  // ADD THIS useEffect
  useEffect(() => {
    setRenewalDate(getRenewalDate(billingCycle));
  }, [billingCycle]);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            tier,
            billingCycle,
          }),
        });

        // Check if response is ok before trying to parse JSON
        if (!response.ok) {
          console.error('API returned error status:', response.status);
          throw new Error(`API error: ${response.status}`);
        }

        // Check if response has content before parsing
        const text = await response.text();
        if (!text) {
          console.error('API returned empty response');
          throw new Error('Empty response from API');
        }

        const data = JSON.parse(text);
        
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

              <SelectedProductCard planName={planData.name} />

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
                  <TertiaryButton
                    onClick={() => router.push('/pricing')}
                    className="text-sm"
                  >
                    Go Back
                  </TertiaryButton>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <g clipPath="url(#clip0_1069_4357)">
                        <path d="M18.3337 9.23306V9.99972C18.3326 11.7967 17.7507 13.5453 16.6748 14.9846C15.5988 16.4239 14.0864 17.4768 12.3631 17.9863C10.6399 18.4958 8.79804 18.4346 7.11238 17.8119C5.42673 17.1891 3.98754 16.0381 3.00946 14.5306C2.03138 13.0231 1.56682 11.2398 1.68506 9.44665C1.80329 7.65353 2.498 5.94666 3.66556 4.58062C4.83312 3.21457 6.41098 2.26254 8.16382 1.86651C9.91665 1.47048 11.7505 1.65167 13.392 2.38306" stroke="#232521" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.3333 3.3335L10 11.6752L7.5 9.17516" stroke="#232521" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_1069_4357">
                          <rect width="20" height="20" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-[#232521]">
                        Genie Maintenance - {planData.name} Plan (Plan renews on {renewalDate})
                      </p>
                      <p className="text-sm text-gray-600">${subtotal.toFixed(2)}</p>
                    </div>
                  </div>

                  {planData.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <g clipPath="url(#clip0_1069_4357)">
                          <path d="M18.3337 9.23306V9.99972C18.3326 11.7967 17.7507 13.5453 16.6748 14.9846C15.5988 16.4239 14.0864 17.4768 12.3631 17.9863C10.6399 18.4958 8.79804 18.4346 7.11238 17.8119C5.42673 17.1891 3.98754 16.0381 3.00946 14.5306C2.03138 13.0231 1.56682 11.2398 1.68506 9.44665C1.80329 7.65353 2.498 5.94666 3.66556 4.58062C4.83312 3.21457 6.41098 2.26254 8.16382 1.86651C9.91665 1.47048 11.7505 1.65167 13.392 2.38306" stroke="#232521" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18.3333 3.3335L10 11.6752L7.5 9.17516" stroke="#232521" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                        </g>
                        <defs>
                          <clipPath id="clip0_1069_4357">
                            <rect width="20" height="20" fill="white"/>
                          </clipPath>
                        </defs>
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
                        <svg className="mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M6.25 10.4165L8.75 12.9165L13.75 7.9165" stroke="#232521" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10.0003 18.3335V18.2502M1.66699 10.0001H1.75033M5.83366 17.2169L5.87533 17.1448M2.78345 5.8334L2.85562 5.87508M17.1451 14.1251L17.2172 14.1668M2.78343 14.1668L2.85561 14.1252M5.83362 2.7832L5.87528 2.85538M14.1253 17.1448L14.167 17.217" stroke="#232521" strokeWidth="1.25" strokeLinecap="round"/>
                          <path d="M10 1.6665C14.6023 1.6665 18.3333 5.39746 18.3333 9.99984" stroke="#232521" strokeWidth="1.25" strokeMiterlimit="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
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

                  <PrimaryButton
                    onClick={() => document.getElementById('checkout-submit-btn')?.click()}
                    disabled={loading}
                    className="w-full mt-6"
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </PrimaryButton>
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
