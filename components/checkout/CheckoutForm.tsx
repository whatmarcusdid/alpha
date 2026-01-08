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
import { TertiaryButton } from '@/components/ui/TertiaryButton';

interface CheckoutFormProps {
  amount: number;
  tier: PricingTier;
  billingCycle: BillingCycle;
}

export default function CheckoutForm({ amount, tier, billingCycle }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maryland');
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Validate all form fields are filled
      if (!name || !address || !city || !state || !zipCode) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate zip code format
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(zipCode)) {
        alert('Please enter a valid zip code');
        setLoading(false);
        return;
      }

      // Submit the payment element to validate
      const { error: submitError } = await elements.submit();
      if (submitError) {
        alert(submitError.message);
        setLoading(false);
        return;
      }

      // Confirm the payment with Stripe
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/confirmation?tier=${tier}&amount=${amount}&billingCycle=${billingCycle}`,
          payment_method_data: {
            billing_details: {
              name: name,
              address: {
                line1: address,
                line2: address2 || undefined,
                city: city,
                state: state,
                postal_code: zipCode,
                country: 'US',
              },
            },
          },
        },
      });

      if (error) {
        // Payment failed
        alert(error.message);
        setLoading(false);
      } else {
        // Payment succeeded - Stripe will redirect to return_url
        // No need to do anything here
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('An unexpected error occurred. Please try again.');
      setLoading(false);
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full min-h-[40px] px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent border-gray-300`}
              placeholder="Marcus Johnson"
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-[#232521] mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={`w-full min-h-[40px] px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent border-gray-300`}
              placeholder="8049 Old Alexandria Ferry Rd"
            />
          </div>

          {/* Address 2 */}
          <div>
            <label htmlFor="address2" className="block text-sm font-medium text-[#232521] mb-1">
              Address 2 (Optional)
            </label>
            <input
              type="text"
              id="address2"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
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
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`w-full min-h-[40px] px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent border-gray-300`}
                placeholder="Clinton"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-[#232521] mb-1">
                State
              </label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
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
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className={`w-full min-h-[40px] px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent border-gray-300`}
                placeholder="20735"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-[#232521] mb-6">Payment Method</h2>
        
        <PaymentElement />
      </div>

      {/* Submit Button - visually hidden, triggered by external button */}
      <button type="submit" id="checkout-submit-btn" className="hidden">
        Submit
      </button>
    </form>
  );
}
