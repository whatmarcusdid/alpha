'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { PricingCard, PricingCardVariant } from './PricingCard';

// Define types for props and plans
type Tier = 'essential' | 'advanced' | 'premium' | 'safety-net';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: Tier;
  onSelectPlan: (tier: Tier) => void;
  isCanceled?: boolean; // Indicates if subscription is canceled
}

interface Plan {
  tier: Tier;
  name: string;
  price: string;
  features: string[];
}

// Custom checkmark icon component
const CheckmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20.3479 7.56384L9.7479 18.1638C9.65402 18.2585 9.52622 18.3117 9.3929 18.3117C9.25958 18.3117 9.13178 18.2585 9.0379 18.1638L3.6479 12.7738C3.55324 12.68 3.5 12.5522 3.5 12.4188C3.5 12.2855 3.55324 12.1577 3.6479 12.0638L4.3479 11.3638C4.44178 11.2692 4.56958 11.2159 4.7029 11.2159C4.83622 11.2159 4.96402 11.2692 5.0579 11.3638L9.3879 15.6938L18.9379 6.14384C19.1357 5.95205 19.4501 5.95205 19.6479 6.14384L20.3479 6.85384C20.4426 6.94772 20.4958 7.07552 20.4958 7.20884C20.4958 7.34216 20.4426 7.46995 20.3479 7.56384Z" fill="#1B4A41"/>
  </svg>
);

// Define plan details and hierarchy
const TIER_HIERARCHY: Record<Tier, number> = {
  'safety-net': 0,
  essential: 1,
  advanced: 2,
  premium: 3,
};

const PLANS: Plan[] = [
  {
    tier: 'essential',
    name: 'Essential',
    price: '899',
    features: [
      '4 Annual support hours',
      '8 Annual maintenance hours',
      'Monthly Traffic Analytics Reports',
      'Monthly Performance Checkups',
      'Monthly Security Monitoring & Backups',
      'Monthly Plugin & Theme Updates',
    ],
  },
  {
    tier: 'advanced',
    name: 'Advanced',
    price: '1,799',
    features: [
      '8 Annual support hours',
      '16 Annual maintenance hours',
      'Bi-Weekly Traffic Analytics Reports',
      'Bi-Weekly Performance Checkups',
      'Bi-Weekly Security Monitoring & Backups',
      'Bi-Weekly Plugin & Theme Update',
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: '2,999',
    features: [
      '20 Annual support hours',
      '40 Annual maintenance hours',
      'Weekly Traffic Analytics Reports',
      'Weekly Performance Checkups',
      'Weekly Security Monitoring & Backups',
      'Weekly Plugin & Theme Updates',
    ],
  },
];

const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onSelectPlan,
  isCanceled = false,
}) => {
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key and body scroll
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle clicks outside the modal to close it
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };
  
  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTier(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef} 
        className="relative flex flex-col w-full h-full max-w-5xl bg-white rounded-lg shadow-xl md:h-auto"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 px-6 py-4 bg-white rounded-t-lg md:px-8">
          <h2 className="text-2xl font-bold text-[#232521]">Choose your plan</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select the plan that best fits your business. You can upgrade or downgrade your subscription at any time.
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow p-6 overflow-y-auto md:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => {
              // If subscription is canceled, ALL plans are selectable
              if (isCanceled) {
                const isSelected = plan.tier === selectedTier;
                
                const handleSelect = () => {
                  setSelectedTier(plan.tier);
                  onSelectPlan(plan.tier);
                };

                return (
                  <PricingCard
                    key={plan.tier}
                    tierName={plan.name}
                    price={plan.price}
                    features={plan.features}
                    variant={isSelected ? 'selected' : 'upgradeable'}
                    onClick={handleSelect}
                    buttonLabel="Get Started"
                  />
                );
              }

              // EXISTING LOGIC for active subscriptions
              const isCurrent = plan.tier === currentTier;
              const isSelected = plan.tier === selectedTier;
              const isUpgradeable = TIER_HIERARCHY[plan.tier] > TIER_HIERARCHY[currentTier];
              const isDowngradeable = TIER_HIERARCHY[plan.tier] < TIER_HIERARCHY[currentTier];
              const isSelectable = isUpgradeable || isDowngradeable;
              
              let variant: PricingCardVariant = 'disabled';
              if (isCurrent) {
                variant = 'current';
              } else if (isSelected) {
                variant = 'selected';
              } else if (isSelectable) {
                variant = 'upgradeable';
              }

              const handleSelect = () => {
                if (isSelectable) {
                  setSelectedTier(plan.tier);
                  onSelectPlan(plan.tier);
                }
              };

              // Determine the button label based on tier relationship
              let buttonLabel: string | undefined = undefined;
              if (!isCurrent) {
                if (isUpgradeable) {
                  buttonLabel = 'Upgrade';
                } else if (isDowngradeable) {
                  buttonLabel = 'Downgrade';
                }
              }

              return (
                <PricingCard
                  key={plan.tier}
                  tierName={plan.name}
                  price={plan.price}
                  features={plan.features}
                  variant={variant}
                  onClick={handleSelect}
                  buttonLabel={buttonLabel}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanSelectionModal;
