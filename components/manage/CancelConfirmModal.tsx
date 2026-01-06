'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { DestructiveButton } from '@/components/ui/DestructiveButton';

interface CancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepSubscription: () => void;
  onContinue: (reason: string) => void;
}

const cancellationReasons: string[] = [
  "Too expensive for my budget",
  "I'm not seeing enough value",
  "I no longer need website maintenance",
  "I'm switching to another provider",
  "Technical issues or bugs in the dashboard",
  "Support experience was not what I expected",
  "My business is pausing or closing",
  "Other",
];

const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
  isOpen,
  onClose,
  onKeepSubscription,
  onContinue,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedReason(null);
    }
  }, [isOpen]);

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
        className="relative flex w-[600px] flex-col items-start gap-6 rounded-lg bg-white p-6 shadow-[0_8px_20px_0_rgba(85,85,85,0.10)]"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between w-full mb-4">
          <h2 className="text-[#0A0A0A] text-2xl font-bold leading-[120%] tracking-[-0.24px]">Are you sure you want to cancel?</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>

        <p className="text-base font-normal leading-relaxed text-gray-700 w-full">
          We'd hate to see you go. Care to share why you're canceling so we can improve TradeSiteGenie?
        </p>

        <div className="space-y-3 mb-8 w-full">
          {cancellationReasons.map((reason) => (
            <label
              key={reason}
              className={`flex items-center p-3 min-h-[40px] cursor-pointer transition-all ${selectedReason === reason ? 'bg-[#F0F5F0]' : 'bg-white'}`}>
              <input
                type="radio"
                name="cancellationReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)}
                className="h-4 w-4 text-[#9be382] border-gray-300 focus:ring-[#8dd370] mr-3"
              />
              <span className="font-medium">{reason}</span>
            </label>
          ))}
        </div>

        <div className="flex w-full gap-4">
          <SecondaryButton
            onClick={onKeepSubscription}
            className="flex-1"
          >
            Keep subscription
          </SecondaryButton>
          <DestructiveButton
            onClick={() => selectedReason && onContinue(selectedReason)}
            disabled={!selectedReason}
            className="flex-1"
          >
            Continue with cancellation
          </DestructiveButton>
        </div>
      </div>
    </div>
  );
};

export default CancelConfirmModal;
