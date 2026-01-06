'use client';

import React, { useEffect, useRef } from 'react';
import { X, CreditCard, ChevronRight } from 'lucide-react';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

interface ManageSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelClick: () => void;
  currentPaymentMethod: string;
}

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCancelClick,
  currentPaymentMethod,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleFocusTrap);
      modalRef.current?.focus();
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative flex w-[600px] h-[400px] flex-col items-start gap-6 rounded-lg bg-white p-6 shadow-[0_8px_20px_0_rgba(85,85,85,0.10)]"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between w-full mb-4">
          <h2 className="text-xl font-semibold">Manage Subscription</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 py-3 w-full">
          <h3 className="text-[#0A0A0A] text-lg font-semibold leading-[120%] tracking-tight">Current payment method</h3>
          <div className="flex items-center gap-4 self-stretch mt-3">
            <div className="flex w-[50px] h-[50px] items-center justify-center rounded-full bg-[#DADADA]">
                <CreditCard className="text-gray-600" size={24} />
            </div>
            <span className="text-[#232521] text-[15px] font-semibold leading-[150%] tracking-tight">{currentPaymentMethod}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <TertiaryButton className="w-full min-h-[40px] px-6 py-2 justify-between">
            <span>Update payment method</span>
            <ChevronRight size={20} />
          </TertiaryButton>
          <TertiaryButton onClick={onCancelClick} className="w-full min-h-[40px] px-6 py-2 justify-between">
            <span>Cancel subscription</span>
            <ChevronRight size={20} />
          </TertiaryButton>
        </div>
      </div>
    </div>
  );
};

export default ManageSubscriptionModal;
