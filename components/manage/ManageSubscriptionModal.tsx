'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, CreditCard, ChevronRight } from 'lucide-react';
import { TertiaryButton } from '@/components/ui/TertiaryButton';
import CancelConfirmModal from '@/components/manage/CancelConfirmModal';
import SafetyNetDownsellModal from '@/components/manage/SafetyNetDownsellModal';
import { UpdatePaymentMethodModalWrapper } from '@/components/manage/UpdatePaymentMethodModalWrapper';
import { PaymentMethodData } from '@/components/manage/UpdatePaymentMethodModal';
import { NotificationToast } from '@/components/ui/NotificationToast';
import {
  trackSubscriptionCancellationStarted,
  trackSubscriptionCanceled,
  trackSubscriptionDowngraded,
} from '@/lib/analytics';

interface ManageSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelClick: (reason: string) => void;
  onUpdatePaymentClick: () => Promise<void>;
  currentPaymentMethod: string;
  currentTier?: string;
  currentPrice?: string;
  renewalDate?: string;
}

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCancelClick,
  onUpdatePaymentClick,
  currentPaymentMethod,
  currentTier,
  currentPrice = '$679/year',
  renewalDate = 'June 15, 2025',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSafetyNetModal, setShowSafetyNetModal] = useState(false);
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    show: boolean;
    message: string;
    subtitle?: string;
  }>({ 
    type: 'success', 
    show: false, 
    message: '',
    subtitle: undefined 
  });

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

  return (
    <>
      {isOpen && (
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
              <TertiaryButton 
                onClick={() => {
                  onClose();
                  setShowUpdatePaymentModal(true);
                }} 
                className="w-full min-h-[40px] px-6 py-2 justify-between"
              >
                <span>Update payment method</span>
                <ChevronRight size={20} />
              </TertiaryButton>
              <TertiaryButton 
                onClick={() => {
                  onClose();
                  setShowCancelModal(true);
                }} 
                className="w-full min-h-[40px] px-6 py-2 justify-between"
              >
                <span>Cancel subscription</span>
                <ChevronRight size={20} />
              </TertiaryButton>
            </div>
          </div>
        </div>
      )}

      <CancelConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onKeepSubscription={() => {
          setShowCancelModal(false);
          onClose();
        }}
        onContinue={(reason) => {
          trackSubscriptionCancellationStarted({
            previous_plan_tier: currentTier,
            cancellation_reason: reason || 'not_specified',
            user_plan_tier: currentTier,
          });
          setCancellationReason(reason);
          setShowCancelModal(false);
          setShowSafetyNetModal(true);
        }}
      />

      <SafetyNetDownsellModal
        isOpen={showSafetyNetModal}
        onClose={() => setShowSafetyNetModal(false)}
        onClaimOffer={async () => {
          setShowSafetyNetModal(false);
          onClose();
          
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
            
            const response = await fetch('/api/stripe/downgrade-to-safety-net', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to downgrade subscription');
            }

            const data = await response.json();

            trackSubscriptionDowngraded({
              previous_plan_tier: currentTier,
              new_plan_tier: 'safety-net',
              billing_period: 'annual',
              user_plan_tier: 'safety-net',
            });
            
            // Show success notification
            setNotification({
              type: 'success',
              show: true,
              message: 'Successfully switched to Safety Net Plan',
              subtitle: 'Your subscription will renew at $299/year. Page will refresh to update your plan details.',
            });
            
            // Refresh page after 2 seconds to show updated subscription
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            
          } catch (error) {
            console.error('Error downgrading subscription:', error);
            
            // Show error notification
            setNotification({
              type: 'error',
              show: true,
              message: 'Failed to downgrade subscription',
              subtitle: error instanceof Error ? error.message : 'Please try again or contact support.',
            });
          }
        }}
        onCancelSubscription={async () => {
          setShowSafetyNetModal(false);
          onClose();
          
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
            
            const response = await fetch('/api/stripe/cancel-subscription', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ 
                reason: cancellationReason 
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to cancel subscription');
            }

            const data = await response.json();

            trackSubscriptionCanceled({
              previous_plan_tier: currentTier,
              cancel_type: 'end_of_period',
              user_plan_tier: currentTier,
            });
            
            // Show success notification
            setNotification({
              type: 'success',
              show: true,
              message: 'Subscription canceled successfully',
              subtitle: `Your subscription will remain active until ${new Date(data.expiresAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}. Page will refresh to update your subscription status.`,
            });
            
            // Refresh page after 3 seconds
            setTimeout(() => {
              window.location.reload();
            }, 3000);
            
          } catch (error) {
            console.error('Error canceling subscription:', error);
            
            // Show error notification
            setNotification({
              type: 'error',
              show: true,
              message: 'Failed to cancel subscription',
              subtitle: error instanceof Error ? error.message : 'Please try again or contact support.',
            });
          }
        }}
        currentPrice={currentPrice}
        renewalDate={renewalDate}
      />

      <UpdatePaymentMethodModalWrapper
        isOpen={showUpdatePaymentModal}
        onClose={() => setShowUpdatePaymentModal(false)}
        onSave={async (paymentData: PaymentMethodData) => {
          setShowUpdatePaymentModal(false);
          await onUpdatePaymentClick();
        }}
        onError={(message: string) => {
          setNotification({
            type: 'error',
            show: true,
            message: 'Unable to Update Payment Method',
            subtitle: message,
          });
        }}
      />

      <NotificationToast
        show={notification.show}
        type={notification.type}
        message={notification.message}
        subtitle={notification.subtitle}
        onDismiss={() => setNotification({ 
          type: 'success', 
          show: false, 
          message: '',
          subtitle: undefined 
        })}
        duration={5000}
      />
    </>
  );
};

export default ManageSubscriptionModal;
