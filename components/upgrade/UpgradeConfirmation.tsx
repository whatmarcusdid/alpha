'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

// --- TYPES AND CONSTANTS ---
type Tier = 'essential' | 'advanced' | 'premium' | 'safety-net';

interface UpgradeConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: Tier;
  newTier: Tier;
  userId: string;
  onSuccess: () => void;
  onError?: (errorMessage: string) => void;
  onChangePlan?: () => void;
  isReactivation?: boolean; // Indicates reactivating a canceled subscription
}

// Custom check icon for order summary
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" stroke="#232521" strokeWidth="1.5" fill="none"/>
    <path d="M6 10L8.5 12.5L14 7" stroke="#232521" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const tierPrices: Record<Tier, number> = {
  'safety-net': 299,
  essential: 679,
  advanced: 1299,
  premium: 2599,
};

const tierNames: Record<Tier, string> = {
  'safety-net': 'Safety Net',
  essential: 'Essential',
  advanced: 'Advanced',
  premium: 'Premium',
};

const tierFeatures: Record<Tier, { support: number; maintenance: number }> = {
  'safety-net': { support: 0, maintenance: 0 },
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
  onChangePlan,
  isReactivation = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
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
  
  // Determine if this is an upgrade or downgrade
  const TIER_HIERARCHY: Record<Tier, number> = {
    'safety-net': 0,
    essential: 1,
    advanced: 2,
    premium: 3,
  };

  const isUpgrade = TIER_HIERARCHY[newTier] > TIER_HIERARCHY[currentTier];
  const isDowngrade = TIER_HIERARCHY[newTier] < TIER_HIERARCHY[currentTier];
  
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
      
      // Choose the correct endpoint based on action type
      let endpoint = '/api/stripe/upgrade-subscription';
      if (isReactivation) {
        endpoint = '/api/stripe/reactivate-subscription';
      } else if (isDowngrade) {
        endpoint = '/api/stripe/downgrade-subscription';
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, newTier, currentTier }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }

      // On successful API call
      onSuccess();
      onClose();

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process change. Please try again.';
      
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-lg shadow-[0px_8px_20px_0px_rgba(85,85,85,0.1)] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-[#0a0a0a] leading-[1.2] tracking-tight">
              {isReactivation ? 'Reactivate Subscription' : isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Modify'} Checkout
            </h2>
            <button 
              onClick={() => !isLoading && onClose()} 
              aria-label="Close modal" 
              disabled={isLoading}
              className="text-[#545552] hover:text-[#232521] transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Plan Selection Card */}
          <div className="border-2 border-[#1B4A41] rounded-md p-5 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-lg font-bold text-[#232521] leading-[1.5]">
                Genie Maintenance - {tierNames[newTier]} Plan
              </p>
            </div>
            {onChangePlan && (
              <button
                onClick={onChangePlan}
                className="text-base font-bold text-[#1B4A41] hover:underline underline-offset-2 transition-all"
                disabled={isLoading}
              >
                Change
              </button>
            )}
          </div>

          {/* Current Payment Method */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[#0a0a0a] leading-[1.2] tracking-tight">
              Current payment method
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-[50px] h-[50px] rounded-full bg-[#DADADA] flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="5" width="20" height="14" rx="2" stroke="#232521" strokeWidth="2" fill="none"/>
                  <path d="M2 9H22" stroke="#232521" strokeWidth="2"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-[#232521] leading-[1.5] tracking-tight">
                  Visa •••• 4242
                </p>
              </div>
              <button
                onClick={handleUpdatePaymentMethod}
                className="text-lg font-bold text-white hover:underline underline-offset-2 tracking-tight"
                disabled={isLoading}
              >
                Update payment method
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-[#FAF9F5] rounded-lg p-4 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
              Order Summary
            </h3>

            {/* Order Items */}
            <div className="flex flex-col gap-0">
              <div className="flex gap-4 items-start">
                <CheckIcon />
                <p className="flex-1 text-sm font-normal text-[#232521] leading-[1.5] tracking-tight">
                  Genie Maintenance - {tierNames[newTier]} Plan (Plan renews on 6/15/26)
                </p>
                <p className="text-sm font-normal text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
                  ${newPlanPrice.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <CheckIcon />
              <p className="flex-1 text-sm font-normal text-[#232521] leading-[1.5] tracking-tight">
                Ongoing Security Monitoring & Backups
              </p>
              <p className="text-sm font-normal text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
                Included
              </p>
            </div>

            {tierFeatures[newTier].support > 0 && (
              <div className="flex gap-4 items-start">
                <CheckIcon />
                <p className="flex-1 text-sm font-normal text-[#232521] leading-[1.5] tracking-tight">
                  {tierFeatures[newTier].support} Annual support hours
                </p>
                <p className="text-sm font-normal text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
                  Included
                </p>
              </div>
            )}

            {tierFeatures[newTier].maintenance > 0 && (
              <div className="flex gap-4 items-start">
                <CheckIcon />
                <p className="flex-1 text-sm font-normal text-[#232521] leading-[1.5] tracking-tight">
                  {tierFeatures[newTier].maintenance} Annual maintenance hours
                </p>
                <p className="text-sm font-normal text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
                  Included
                </p>
              </div>
            )}

            {newTier === 'safety-net' && (
              <div className="flex gap-4 items-start">
                <CheckIcon />
                <p className="flex-1 text-sm font-normal text-[#232521] leading-[1.5] tracking-tight">
                  Emergency support (limited hours)
                </p>
                <p className="text-sm font-normal text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
                  Included
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-300 w-full" />

            {/* Pricing Summary */}
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                Subtotal
              </p>
              <p className="text-base font-bold text-[#232521] leading-[1.2] tracking-tight">
                ${newPlanPrice.toFixed(2)}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                Taxes
              </p>
              <p className="text-base font-bold text-[#232521] leading-[1.2] tracking-tight">
                ${taxes.toFixed(2)}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-300 w-full" />

            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                {isDowngrade ? 'Prorated Credit Applied' : 'Total Due Today'}
              </p>
              <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                {isDowngrade ? '-$' : '$'}{Math.abs(totalDue).toFixed(2)}
              </p>
            </div>

            {isDowngrade && (
              <p className="text-sm text-[#545552] leading-[1.5] mt-2">
                Your unused time on the {tierNames[currentTier]} plan will be credited toward your {tierNames[newTier]} plan. 
                The credit will be applied to your next billing cycle on 6/15/26.
              </p>
            )}
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-end gap-6 p-6 border-t border-gray-200">
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
              isReactivation ? 'Confirm Subscription' : isDowngrade ? 'Confirm Downgrade' : 'Place Order'
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default UpgradeConfirmation;
