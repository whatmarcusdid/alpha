'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

interface UpdatePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paymentData: PaymentMethodData) => Promise<void>;
}

export interface PaymentMethodData {
  nameOnCard: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
}

const states = [
  'Maryland',
  'Virginia',
  'DC',
  'Delaware',
  'Pennsylvania',
  'West Virginia',
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Washington',
  'Wisconsin',
  'Wyoming',
];

export function UpdatePaymentMethodModal({ isOpen, onClose, onSave }: UpdatePaymentMethodModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [formData, setFormData] = useState<PaymentMethodData>({
    nameOnCard: '',
    address: '',
    address2: '',
    city: '',
    state: 'Maryland',
    zipCode: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);

  // Track when Stripe Elements are fully initialized
  useEffect(() => {
    if (stripe && elements) {
      setIsElementsReady(true);
    }
  }, [stripe, elements]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    try {
      // Validate all form fields are filled
      if (!formData.nameOnCard || !formData.address || !formData.city || !formData.state || !formData.zipCode) {
        alert('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      // Validate zip code format
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(formData.zipCode)) {
        alert('Please enter a valid zip code');
        setIsLoading(false);
        return;
      }

      // Submit the payment element to validate
      const { error: submitError } = await elements.submit();
      if (submitError) {
        alert(submitError.message);
        setIsLoading(false);
        return;
      }

      // Confirm the setup with Stripe
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: formData.nameOnCard,
              address: {
                line1: formData.address,
                line2: formData.address2 || undefined,
                city: formData.city,
                state: formData.state,
                postal_code: formData.zipCode,
                country: 'US',
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        alert(error.message);
        setIsLoading(false);
        return;
      }

      if (setupIntent && setupIntent.status === 'succeeded') {
        // Extract payment method ID from setupIntent
        const paymentMethodId = typeof setupIntent.payment_method === 'string' 
          ? setupIntent.payment_method 
          : setupIntent.payment_method?.id;

        if (!paymentMethodId) {
          alert('Unable to update payment method - please try again');
          setIsLoading(false);
          return;
        }

        try {
          // Get Firebase auth token
          const { getAuth } = await import('firebase/auth');
          let auth;
          
          if (typeof window !== 'undefined') {
            await import('@/lib/firebase');
            auth = getAuth();
          }
          
          const user = auth?.currentUser;
          
          if (!user) {
            throw new Error('Not authenticated');
          }
          
          const token = await user.getIdToken();

          // Call attach-payment-method API
          const response = await fetch('/api/stripe/attach-payment-method', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentMethodId }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            // Handle specific error messages
            const errorMessage = data.error || 'Unable to update payment method';
            
            // Check for card-specific errors
            if (errorMessage.toLowerCase().includes('card') || 
                errorMessage.toLowerCase().includes('declined')) {
              alert('Card declined - please try another card');
            } else {
              alert('Unable to update payment method - please try again');
            }
            
            setIsLoading(false);
            return;
          }

          // Success - payment method attached and set as default
          console.log(`✅ Payment method updated: ${data.card.brand} ****${data.card.last4}`);
          
          // Call onSave with billing address data
          await onSave(formData);
          onClose();
        } catch (apiError: any) {
          console.error('Error calling attach-payment-method API:', apiError);
          alert('Unable to update payment method - please try again');
          setIsLoading(false);
          return;
        }
      }
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      
      // User-friendly error messages
      if (error.message?.toLowerCase().includes('card') || 
          error.message?.toLowerCase().includes('declined')) {
        alert('Card declined - please try another card');
      } else {
        alert('Unable to update payment method - please try again');
      }
      
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      nameOnCard: '',
      address: '',
      address2: '',
      city: '',
      state: 'Maryland',
      zipCode: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-extrabold text-[#0a0a0a] tracking-[-0.24px]">
              Manage Subscription
            </h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-3">
            <h3 className="text-lg font-bold text-[#0a0a0a] tracking-[-0.18px] mb-3">
              Update payment method
            </h3>

            {/* Name on Card */}
            <div>
              <label htmlFor="nameOnCard" className="block text-sm font-semibold text-[#232521] mb-1">
                Name on card
              </label>
              <input
                type="text"
                id="nameOnCard"
                name="nameOnCard"
                value={formData.nameOnCard}
                onChange={handleInputChange}
                placeholder="Marcus Johnson"
                className="w-full min-h-[46px] px-5 py-3 bg-white border-[1.5px] border-[#dadada] rounded-md text-sm text-[#232521] placeholder:text-[#232521] focus:outline-none focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-semibold text-[#232521] mb-1">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="8049 Old Alexandria Ferry Rd"
                className="w-full min-h-[46px] px-5 py-3 bg-white border-[1.5px] border-[#dadada] rounded-md text-sm text-[#232521] placeholder:text-[#232521] focus:outline-none focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
              />
            </div>

            {/* Address 2 (Optional) */}
            <div>
              <label htmlFor="address2" className="block text-sm font-semibold text-[#232521] mb-1">
                Address 2 (Optional)
              </label>
              <input
                type="text"
                id="address2"
                name="address2"
                value={formData.address2}
                onChange={handleInputChange}
                placeholder=""
                className="w-full min-h-[46px] px-5 py-3 bg-white border-[1.5px] border-[#dadada] rounded-md text-sm text-[#b5b6b5] placeholder:text-[#b5b6b5] focus:outline-none focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
              />
            </div>

            {/* City, State, Zip Code Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* City */}
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-[#232521] mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Clinton"
                  className="w-full min-h-[46px] px-5 py-3 bg-white border-[1.5px] border-[#dadada] rounded-md text-sm text-[#232521] placeholder:text-[#232521] focus:outline-none focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
                />
              </div>

              {/* State */}
              <div>
                <label htmlFor="state" className="block text-sm font-semibold text-[#232521] mb-1">
                  State
                </label>
                <div className="relative">
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full min-h-[46px] px-5 py-3 bg-white border border-[#dfe4ea] rounded-md text-sm text-[#232521] appearance-none focus:outline-none focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
                  >
                    {states.map(state => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#232521]" />
                </div>
              </div>

              {/* Zip Code */}
              <div>
                <label htmlFor="zipCode" className="block text-sm font-semibold text-[#232521] mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="20735"
                  className="w-full min-h-[46px] px-5 py-3 bg-white border-[1.5px] border-[#dadada] rounded-md text-sm text-[#232521] placeholder:text-[#232521] focus:outline-none focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
                />
              </div>
            </div>

            {/* Payment Method - Stripe PaymentElement */}
            <div>
              <h4 className="text-sm font-semibold text-[#232521] mb-3">
                Card Information
              </h4>
              {!isElementsReady ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9be382]"></div>
                  <p className="ml-3 text-gray-600">Loading payment form...</p>
                </div>
              ) : (
                <PaymentElement 
                  options={{
                    layout: 'tabs',
                  }}
                />
              )}
            </div>
          </div>

          {/* Footer with buttons */}
          <div className="border-t border-[rgba(111,121,122,0.4)] bg-white px-4 py-4 flex items-center justify-end gap-4">
            <SecondaryButton onClick={handleCancel} disabled={isLoading}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSave} disabled={isLoading || !isElementsReady}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </>
  );
}

