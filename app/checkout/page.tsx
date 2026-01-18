'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { PRICING, PricingTier, BillingCycle, getPrice, getRenewalDate } from '@/lib/stripe';
import { PageCard } from '@/components/layout/PageCard';
import { Header } from '@/components/layout/Header';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SelectedProductCard } from '@/components/checkout/SelectedProductCard';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Define types for applied coupon
interface AppliedCoupon {
  valid: boolean;
  id: string;
  percentOff: number | null;
  amountOff: number | null;
  duration: string;
  durationInMonths: number | null;
  name: string | null;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = (searchParams?.get('tier') as PricingTier) || 'essential';
  
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [loading, setLoading] = useState(false);
  const [renewalDate, setRenewalDate] = useState<string>('');
  
  // Promo code states
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [promoError, setPromoError] = useState<string>('');
  const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);

  const planData = PRICING[tier];
  
  // Calculate pricing with discount
  const subtotal = getPrice(tier);
  const discount = appliedCoupon?.percentOff 
    ? (subtotal * appliedCoupon.percentOff / 100) 
    : (appliedCoupon?.amountOff || 0) / 100; // Stripe amount is in cents
  const discountedSubtotal = subtotal - discount;
  const taxRate = 0.06;
  const taxes = discountedSubtotal * taxRate;
  const total = discountedSubtotal + taxes;

  // Set renewal date (annual only)
  useEffect(() => {
    setRenewalDate(getRenewalDate('annual'));
  }, []); // Empty dependency array - renewal date set once on mount

  // Handle promo code application
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setIsApplyingPromo(true);
    setPromoError('');
    
    try {
      const response = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: promoCode.trim().toUpperCase() })
      });
      
      const data = await response.json();
      
      if (data.valid) {
        setAppliedCoupon(data);
        setPromoError('');
      } else {
        setPromoError(data.error || 'Invalid promo code');
        setAppliedCoupon(null);
      }
    } catch (error) {
      setPromoError('Failed to apply promo code');
      setAppliedCoupon(null);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Handle checkout - redirect to Stripe Checkout
  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingCycle,
          couponCode: appliedCoupon?.id || null,
        }),
      });

      if (!response.ok) {
        console.error('API returned error status:', response.status);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.sessionId) {
        // Redirect to Stripe Checkout
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const { error } = await (stripe as any).redirectToCheckout({
          sessionId: data.sessionId,
        });

        if (error) {
          console.error('Stripe redirect error:', error);
          alert(error.message);
        }
      } else {
        console.error('Failed to create checkout session:', data);
        alert('Failed to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageCard>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-[#232521] mb-8">Checkout</h1>

              <SelectedProductCard planName={planData.name} />

              <div className="bg-white rounded-lg border border-gray-200 p-8 mt-6">
                <h2 className="text-xl font-bold text-[#232521] mb-4">Payment Information</h2>
                <p className="text-gray-600 mb-6">
                  You'll be redirected to Stripe's secure checkout to complete your subscription purchase.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">What happens next:</h3>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• You'll be redirected to Stripe's secure payment page</li>
                    <li>• Enter your payment details safely with Stripe</li>
                    <li>• Your subscription will activate immediately upon payment</li>
                    <li>• You'll return here to create your account</li>
                  </ul>
                </div>
              </div>
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
                      <p className="text-sm text-gray-600">${subtotal.toFixed(2)}/year</p>
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
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedCoupon.percentOff}% off)</span>
                      <span className="font-medium">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="pt-3">
                    <label className="block text-sm font-medium text-[#232521] mb-2">
                      Promo Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        disabled={!!appliedCoupon}
                        className="flex-1 min-h-[40px] px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent disabled:bg-gray-100"
                      />
                      {!appliedCoupon ? (
                        <button
                          onClick={handleApplyPromo}
                          disabled={!promoCode.trim() || isApplyingPromo}
                          className="px-4 py-2 bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                        >
                          {isApplyingPromo ? 'Applying...' : 'Apply'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setAppliedCoupon(null);
                            setPromoCode('');
                          }}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg min-h-[40px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    {promoError && (
                      <p className="text-sm text-red-600 mt-1">{promoError}</p>
                    )}
                    
                    {appliedCoupon && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {appliedCoupon.percentOff}% off applied!
                      </p>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 pt-3">
                    <p className="italic">Taxes calculated at checkout</p>
                  </div>

                  <PrimaryButton
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full mt-6"
                  >
                    {loading ? 'Processing...' : 'Continue to Payment'}
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
