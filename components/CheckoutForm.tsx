'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { PricingTier, BillingCycle } from '@/lib/stripe';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface CheckoutFormProps {
  amount: number;
  tier: PricingTier;
  billingCycle: BillingCycle;
}

// TypeScript type for form data
type BillingInfo = {
  nameOnCard: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
};

export default function CheckoutForm({ amount, tier, billingCycle }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    nameOnCard: '',
    address: '',
    address2: '',
    city: '',
    state: 'Maryland',
    zipCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!billingInfo.nameOnCard.trim()) {
      newErrors.nameOnCard = 'Name on card is required';
    }
    if (!billingInfo.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!billingInfo.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!billingInfo.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(billingInfo.zipCode)) {
      newErrors.zipCode = 'Invalid zip code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/confirmation?tier=${tier}&amount=${amount}&billingCycle=${billingCycle}`,
          payment_method_data: {
            billing_details: {
              name: billingInfo.nameOnCard,
              address: {
                line1: billingInfo.address,
                line2: billingInfo.address2 || undefined,
                city: billingInfo.city,
                state: billingInfo.state,
                postal_code: billingInfo.zipCode,
                country: 'US',
              },
            },
          },
        },
      });

      if (error) {
        console.error('Payment error:', error);
        alert(error.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Billing Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-[#232521] mb-6">Billing Information</h2>

        <div className="space-y-4">
          {/* Name on Card */}
          <div>
            <label htmlFor="nameOnCard" className="block text-sm font-medium text-[#232521] mb-1">
              Name on card
            </label>
            <input
              type="text"
              id="nameOnCard"
              value={billingInfo.nameOnCard}
              onChange={(e) => setBillingInfo({ ...billingInfo, nameOnCard: e.target.value })}
              className={`w-full min-h-[40px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent ${
                errors.nameOnCard ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Marcus Johnson"
            />
            {errors.nameOnCard && (
              <p className="mt-1 text-sm text-red-600">{errors.nameOnCard}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-[#232521] mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              value={billingInfo.address}
              onChange={(e) => setBillingInfo({ ...billingInfo, address: e.target.value })}
              className={`w-full min-h-[40px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="8049 Old Alexandria Ferry Rd"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* Address 2 */}
          <div>
            <label htmlFor="address2" className="block text-sm font-medium text-[#232521] mb-1">
              Address 2 (Optional)
            </label>
            <input
              type="text"
              id="address2"
              value={billingInfo.address2}
              onChange={(e) => setBillingInfo({ ...billingInfo, address2: e.target.value })}
              className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-[#232521] mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                value={billingInfo.city}
                onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
                className={`w-full min-h-[40px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Clinton"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-[#232521] mb-1">
                State
              </label>
              <select
                id="state"
                value={billingInfo.state}
                onChange={(e) => setBillingInfo({ ...billingInfo, state: e.target.value })}
                className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
              >
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-[#232521] mb-1">
                Zip Code
              </label>
              <input
                type="text"
                id="zipCode"
                value={billingInfo.zipCode}
                onChange={(e) => setBillingInfo({ ...billingInfo, zipCode: e.target.value })}
                className={`w-full min-h-[40px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent ${
                  errors.zipCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="20735"
              />
              {errors.zipCode && (
                <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-[#232521] mb-6">Payment Method</h2>
        
        <PaymentElement />
      </div>

      {/* Submit Button */}
      <PrimaryButton type="submit" disabled={!stripe || isProcessing}>
        {isProcessing ? 'Processing...' : 'Place Order'}
      </PrimaryButton>

      <div className="text-center">
        <button
          type="button"
          onClick={() => router.push('/pricing')}
          className="text-sm text-gray-600 hover:text-[#232521]"
        >
          Go Back
        </button>
      </div>
    </form>
  );
}
