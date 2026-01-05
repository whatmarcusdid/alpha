'use client';

import React from 'react';
import { X, CreditCard, LogOut, ChevronRight } from 'lucide-react';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

interface ManageSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelClick: () => void;
  onUpdatePaymentClick?: () => void;
  currentPaymentMethod: string;
}

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCancelClick,
  onUpdatePaymentClick,
  currentPaymentMethod,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#232521]">Manage Subscription</h2>
            <button onClick={onClose} aria-label="Close modal">
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                    <CreditCard size={24} className="text-gray-500" />
                    <p className="font-medium">{currentPaymentMethod}</p>
                </div>
            </div>

            <TertiaryButton 
              onClick={onUpdatePaymentClick}
              className="w-full min-h-[40px] px-6 py-2 justify-between"
            >
              <span>Update payment method</span>
              <ChevronRight size={20} />
            </TertiaryButton>
            
            <TertiaryButton 
              onClick={onCancelClick}
              className="w-full min-h-[40px] px-6 py-2 justify-between text-red-600 hover:bg-red-50 hover:text-red-700"
            >
                <span>Cancel Subscription</span>
                <LogOut size={20} />
            </TertiaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSubscriptionModal;
