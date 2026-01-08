'use client';

import React, { useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { DestructiveButton } from '@/components/ui/DestructiveButton';

interface SafetyNetDownsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimOffer: () => void;
  onCancelSubscription: () => void;
  currentPrice: string;
  renewalDate: string;
}

const SafetyNetDownsellModal: React.FC<SafetyNetDownsellModalProps> = ({
  isOpen,
  onClose,
  onClaimOffer,
  onCancelSubscription,
  currentPrice,
  renewalDate,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative flex w-[700px] flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-[0_8px_20px_0_rgba(85,85,85,0.10)]"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between w-full">
          <h2 className="text-left text-[#0A0A0A] text-2xl font-bold leading-[120%] tracking-[-0.24px]">Before you cancel... want a lighter plan?</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 flex-shrink-0">
            <X size={24} />
          </button>
        </div>

        <p className="text-left text-base font-normal leading-relaxed text-gray-700 w-full">
          Keep the essentials that prevent 'site down' disasters, without paying for full maintenance.
        </p>

        <div className="flex h-[55px] flex-col items-center justify-center gap-2 self-stretch rounded-lg bg-[#F7F6F1]">
            <h3 className="text-center text-lg font-bold leading-snug text-[#232521]">Switch to the Safety Net Plan for $299/year</h3>
        </div>

        <p className="text-left text-sm font-semibold leading-tight text-gray-700 w-full">
            Renew on {renewalDate} at $299, instead of {currentPrice}
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h4 className="font-semibold text-lg mb-3 flex items-center"><Check className="text-green-600 mr-2" size={22} />You'll still get</h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start"><Check className="text-green-600 mr-2 mt-1 flex-shrink-0" size={18} />Daily cloud backups (50-day retention)</li>
              <li className="flex items-start"><Check className="text-green-600 mr-2 mt-1 flex-shrink-0" size={18} />Security monitoring with alerts</li>
              <li className="flex items-start"><Check className="text-green-600 mr-2 mt-1 flex-shrink-0" size={18} />Emergency restore coverage if your site goes down</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3 flex items-center"><X className="text-red-600 mr-2" size={22} />You won't get</h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start"><X className="text-red-600 mr-2 mt-1 flex-shrink-0" size={18} />Monthly WordPress, plugin, or theme updates</li>
              <li className="flex items-start"><X className="text-red-600 mr-2 mt-1 flex-shrink-0" size={18} />Included support or maintenance hours</li>
              <li className="flex items-start"><X className="text-red-600 mr-2 mt-1 flex-shrink-0" size={18} />Monthly analytics reports</li>
            </ul>
          </div>
        </div>
        <p className="text-left text-[15px] leading-relaxed text-[#545552] w-full mb-6">
          By canceling, you'll lose backup retention, security monitoring, and emergency restore coverage. If your site goes down or gets compromised after cancellation, TradeSiteGenie won't be able to restore it.
        </p>

        <div className="flex w-full gap-4">
          <SecondaryButton onClick={onClaimOffer} className="flex-1">
            Claim Offer and Switch
          </SecondaryButton>
          <DestructiveButton onClick={onCancelSubscription} className="flex-1">
            Cancel My Subscription
          </DestructiveButton>
        </div>
      </div>
    </div>
  );
};

export default SafetyNetDownsellModal;
