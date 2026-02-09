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
  paymentMethod?: { brand: string; last4: string } | null;
  renewalDate?: string | null; // ISO date string or formatted date
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
  essential: 899,
  advanced: 1799,
  premium: 2999,
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

// Helper function to capitalize card brand names
function capitalizeCardBrand(brand: string): string {
  const brandMap: Record<string, string> = {
    'visa': 'Visa',
    'mastercard': 'Mastercard',
    'amex': 'American Express',
    'discover': 'Discover',
    'jcb': 'JCB',
    'diners': 'Diners Club',
    'unionpay': 'UnionPay',
  };
  return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
}

// Helper function to format renewal date as M/D/YY
function formatRenewalDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Annual subscription';
  
  try {
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // 0-indexed
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2); // Last 2 digits
    return `${month}/${day}/${year}`;
  } catch {
    return 'Annual subscription';
  }
}

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
  paymentMethod,
  renewalDate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    amountDue: number;
    credit: number;
    subtotal: number;
    prorationCredit: number;
    tax: number;
    isUpgrade: boolean;
    isDowngrade: boolean;
    renewalDate: string;
    lineItems: Array<{ description: string; amount: number }>;
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setPreview(null);
      setPreviewError(null);
    }
  }, [isOpen]);

  // Fetch proration preview when modal opens
  useEffect(() => {
    if (isOpen && newTier && !isReactivation) {
      fetchProrationPreview();
    } else if (isOpen && isReactivation) {
      // For reactivations, skip preview and use static pricing
      setIsLoadingPreview(false);
    }
  }, [isOpen, newTier, isReactivation]);

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
  
  // Memoize pricing calculations (fallback for reactivations or if preview fails)
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

  const fetchProrationPreview = async () => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    
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

      const response = await fetch('/api/stripe/preview-proration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newTier }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load pricing');
      }

      setPreview(data.preview);
      console.log('✅ Proration preview loaded:', data.preview);
    } catch (error: any) {
      console.error('❌ Error fetching proration preview:', error);
      setPreviewError(error.message || 'Unable to load pricing preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

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
                  {paymentMethod 
                    ? `${capitalizeCardBrand(paymentMethod.brand)} •••• ${paymentMethod.last4}`
                    : 'No payment method on file'
                  }
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

            {isLoadingPreview ? (
              // Loading state
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Calculating your pricing...</span>
              </div>
            ) : previewError ? (
              // Error state
              <div className="text-center py-4 text-red-600">
                <p>{previewError}</p>
                <button 
                  onClick={fetchProrationPreview} 
                  className="text-sm underline mt-2 hover:text-red-700"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* Order Items */}
                <div className="flex flex-col gap-0">
                  <div className="flex gap-4 items-start">
                    <CheckIcon />
                    <p className="flex-1 text-sm font-normal text-[#232521] leading-[1.5] tracking-tight">
                      Genie Maintenance - {tierNames[newTier]} Plan {(preview?.renewalDate || renewalDate) ? `(Plan renews on ${formatRenewalDate(preview?.renewalDate || renewalDate)})` : '(Annual subscription)'}
                    </p>
                    <p className="text-sm font-normal text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
                      ${(preview?.subtotal || newPlanPrice).toFixed(2)}
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
                    ${(preview?.subtotal || newPlanPrice).toFixed(2)}
                  </p>
                </div>

                {/* Show proration credit if it exists */}
                {preview && preview.prorationCredit !== 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                      {preview.prorationCredit < 0 ? 'Proration Credit' : 'Proration Charge'}
                    </p>
                    <p className="text-base font-bold text-[#232521] leading-[1.2] tracking-tight">
                      {preview.prorationCredit < 0 ? '-' : ''}${Math.abs(preview.prorationCredit).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Show taxes if applicable */}
                {(preview?.tax || taxes) > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                      Taxes
                    </p>
                    <p className="text-base font-bold text-[#232521] leading-[1.2] tracking-tight">
                      ${(preview?.tax || taxes).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-gray-300 w-full" />

                {/* Total Due or Credit */}
                {preview?.isDowngrade || (!preview && isDowngrade) ? (
                  <>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                        Credit Applied
                      </p>
                      <p className="text-lg font-bold text-[#9be382] leading-[1.2] tracking-tight">
                        ${(preview?.credit || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                        Total Due Today
                      </p>
                      <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                        $0.00
                      </p>
                    </div>
                    <p className="text-sm text-[#545552] leading-[1.5] mt-2">
                      Your unused time on the {tierNames[currentTier]} plan will be credited toward your {tierNames[newTier]} plan. 
                      {(preview?.renewalDate || renewalDate)
                        ? `The credit will be applied to your next billing cycle on ${formatRenewalDate(preview?.renewalDate || renewalDate)}.`
                        : 'The credit will be applied to your next billing cycle.'
                      }
                    </p>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                      Total Due Today
                    </p>
                    <p className="text-lg font-bold text-[#232521] leading-[1.2] tracking-tight">
                      ${(preview?.amountDue || totalDue).toFixed(2)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-end gap-6 p-6 border-t border-gray-200">
          <SecondaryButton
            onClick={() => !isLoading && !isLoadingPreview && onClose()}
            disabled={isLoading || isLoadingPreview}
          >
            Go Back
          </SecondaryButton>
          
          <PrimaryButton
            onClick={handleUpgrade}
            disabled={isLoading || isLoadingPreview}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : isLoadingPreview ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              isReactivation ? 'Confirm Subscription' : (preview?.isDowngrade || (!preview && isDowngrade)) ? 'Confirm Downgrade' : 'Place Order'
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default UpgradeConfirmation;
