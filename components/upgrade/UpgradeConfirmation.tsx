'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

// --- TYPES AND CONSTANTS ---
type Tier = 'essential' | 'advanced' | 'premium';

interface UpgradeConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: Tier;
  newTier: Tier;
  userId: string;
  onSuccess: () => void;
  onError?: (errorMessage: string) => void;
}

// Custom check icon for order summary
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M18.3346 9.23306V9.99972C18.3336 11.7967 17.7517 13.5453 16.6757 14.9846C15.5998 16.4239 14.0874 17.4768 12.3641 17.9863C10.6408 18.4958 8.79902 18.4346 7.11336 17.8119C5.4277 17.1891 3.98851 16.0381 3.01044 14.5306C2.03236 13.0231 1.56779 11.2398 1.68603 9.44665C1.80427 7.65353 2.49897 5.94666 3.66654 4.58062C4.8341 3.21457 6.41196 2.26254 8.16479 1.86651C9.91763 1.47048 11.7515 1.65167 13.393 2.38306" stroke="#232521" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.3333 3.3335L10 11.6752L7.5 9.17516" stroke="#232521" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const tierPrices: Record<Tier, number> = {
  essential: 679,
  advanced: 1299,
  premium: 2599,
};

const tierNames: Record<Tier, string> = {
  essential: 'Essential',
  advanced: 'Advanced',
  premium: 'Premium',
};

const tierFeatures: Record<Tier, { support: number; maintenance: number }> = {
  essential: { support: 4, maintenance: 8 },
  advanced: { support: 8, maintenance: 16 },
  premium: { support: 20, maintenance: 40 },
};

// --- COMPONENT --- 
const UpgradeConfirmation: React.FC<UpgradeConfirmationProps> = ({
  isOpen,
  onClose,
  currentTier,
  newTier,
  userId,
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Memoize pricing calculations
  const { subtotal, taxes, totalDue, newPlanPrice } = useMemo(() => {
    const newPrice = tierPrices[newTier];
    const calculatedTaxes = newPrice * 0.06;
    const total = newPrice + calculatedTaxes;

    return {
      subtotal: newPrice,
      taxes: calculatedTaxes,
      totalDue: total,
      newPlanPrice: newPrice,
    };
  }, [newTier]);

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/upgrade-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newTier }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }

      // On successful API call
      onSuccess();
      onClose();

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process upgrade. Please try again.';
      setError(errorMessage);
      
      // Call onError callback if provided
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url; // Redirect to Stripe Customer Portal
      }
    } catch (error) {
      console.error('Error opening payment portal:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 sm:items-center"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="relative w-full max-w-2xl bg-white sm:rounded-lg shadow-xl flex flex-col transition-transform duration-300 transform-gpu animate-slide-up sm:animate-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-gray-200 sm:p-6 rounded-t-lg">
          <h2 className="text-xl font-bold text-[#232521]">Checkout</h2>
          <button onClick={() => !isLoading && onClose()} aria-label="Close modal" disabled={isLoading}>
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          
          {/* Upgrade Summary */}
          <div className="p-6 mb-6 border-2 border-gray-200 rounded-lg bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Current Plan</p>
                <p className="text-base font-semibold text-[#232521]">
                  Genie Maintenance - {tierNames[currentTier]} Plan
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-2">New Plan</p>
                <p className="text-base font-semibold text-[#232521]">
                  Genie Maintenance - {tierNames[newTier]} Plan
                </p>
              </div>
            </div>
          </div>

          {/* Current payment method */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#232521] mb-4">Current payment method</h3>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-[#DADADA] rounded-full border border-gray-200">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="#232521" strokeWidth="2" fill="none"/>
                    <path d="M2 9H22" stroke="#232521" strokeWidth="2"/>
                  </svg>
                </div>
                <p className="text-base font-medium text-[#232521]">Visa •••• 4242</p>
              </div>
              <button
                onClick={handleUpdatePaymentMethod}
                className="text-sm font-semibold text-[#1b4a41] hover:underline"
                disabled={isLoading}
              >
                Update payment method
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#232521] mb-4">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <div>
                    <p className="font-medium text-[#232521]">
                      Genie Maintenance - {tierNames[newTier]} Plan (Plan renews on 6/15/26)
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-[#232521]">${newPlanPrice.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <p className="text-gray-700">Ongoing Security Monitoring & Backups</p>
                </div>
                <p className="text-gray-600">Included</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <p className="text-gray-700">{tierFeatures[newTier].support} Annual support hours</p>
                </div>
                <p className="text-gray-600">Included</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <p className="text-gray-700">{tierFeatures[newTier].maintenance} Annual maintenance hours</p>
                </div>
                <p className="text-gray-600">Included</p>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-3 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-base">
              <p className="text-gray-700">Subtotal</p>
              <p className="font-medium text-[#232521]">${newPlanPrice.toFixed(2)}</p>
            </div>
            <div className="flex justify-between text-base">
              <p className="text-gray-700">Taxes</p>
              <p className="font-medium text-[#232521]">${taxes.toFixed(2)}</p>
            </div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
              <p className="text-[#232521]">Total Due Today</p>
              <p className="text-[#232521]">${totalDue.toFixed(2)}</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 mt-6 text-sm text-red-900 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="ml-3">
                        <p className="font-bold">Upgrade failed</p>
                        <p className="mt-1">{error}</p>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse w-full gap-3 p-4 border-t border-gray-200 sm:flex-row sm:justify-end sm:p-6">
          <SecondaryButton
            onClick={() => !isLoading && onClose()}
            disabled={isLoading}
          >
            Go Back
          </SecondaryButton>
          
          <PrimaryButton
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default UpgradeConfirmation;
