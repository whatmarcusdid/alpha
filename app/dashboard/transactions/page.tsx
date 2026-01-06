'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PlanSelectionModal from '@/components/upgrade/PlanSelectionModal';
import UpgradeConfirmation from '@/components/upgrade/UpgradeConfirmation';
import ManageSubscriptionModal from '@/components/manage/ManageSubscriptionModal';
import { NotificationToast } from '@/components/ui/NotificationToast';

type Tier = 'essential' | 'advanced' | 'premium';

const tierNames: Record<Tier, string> = {
  essential: 'Essential',
  advanced: 'Advanced',
  premium: 'Premium',
};

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [currentTier, setCurrentTier] = useState<Tier>('essential'); // Default tier
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<Tier | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const handleSelectPlan = (tier: Tier) => {
    setSelectedUpgradeTier(tier);
    setIsModalOpen(false);
    setShowConfirmation(true);
  };

  const handleUpgradeSuccess = () => {
    if (selectedUpgradeTier) {
      setCurrentTier(selectedUpgradeTier);
    }
    setNotification({ 
      type: 'success', 
      show: true,
      message: 'Upgrade confirmed',
      subtitle: 'Your subscription has been updated, and your new annual rate will apply going forward.'
    });
    setSelectedUpgradeTier(null);
  };
  
  const handleUpgradeError = (errorMessage: string) => {
    setNotification({ 
      type: 'error', 
      show: true,
      message: 'Upgrade failed',
      subtitle: errorMessage
    });
  };

  const handleUpdatePaymentMethod = async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening payment portal:', error);
      setNotification({ 
        type: 'error', 
        show: true,
        message: 'Error opening payment portal',
        subtitle: 'Please try again later.'
      });
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Or a login prompt
  }

  return (
    <>
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

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#232521]">Transactions</h1>
            <p className="text-sm text-gray-600 mt-1">
              Review your billing history and manage your subscription.
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
              Current Plan: <span className="font-bold text-[#232521]">{tierNames[currentTier]}</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-[#232521]">Subscription Management</h2>
          <p className="text-sm text-gray-600 mt-2">
            Your current subscription is the <span className="font-semibold">{tierNames[currentTier]} Plan</span>.
            Ready to level up? Upgrade your plan for more features and support.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 text-sm font-semibold bg-[#1B4A41] text-white rounded-full hover:bg-opacity-90"
            >
              Upgrade Plan
            </button>
            <button 
              onClick={() => setShowManageModal(true)}
              className="px-5 py-2.5 text-sm font-semibold text-[#1B4A41] border-2 border-[#1B4A41] rounded-full hover:bg-gray-50"
            >
              Manage Subscription
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-[#232521] mb-4">Billing History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-600">
                  <th className="font-medium p-3">Date</th>
                  <th className="font-medium p-3">Description</th>
                  <th className="font-medium p-3 text-right">Amount</th>
                  <th className="font-medium p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 text-sm">
                  <td className="p-3">June 15, 2024</td>
                  <td className="p-3">Genie Maintenance - {tierNames[currentTier]} Plan</td>
                  <td className="p-3 text-right">$679.00</td>
                  <td className="p-3 text-right">
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      Paid
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {
        currentTier && (
            <>
                <PlanSelectionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentTier={currentTier}
                    onSelectPlan={handleSelectPlan}
                />

                {selectedUpgradeTier && (
                    <UpgradeConfirmation
                        isOpen={showConfirmation}
                        onClose={() => {
                            setShowConfirmation(false);
                            setSelectedUpgradeTier(null);
                        }}
                        currentTier={currentTier}
                        newTier={selectedUpgradeTier}
                        userId={user?.uid || ''}
                        onSuccess={handleUpgradeSuccess}
                        onError={handleUpgradeError}
                    />
                )}

                <ManageSubscriptionModal
                    isOpen={showManageModal}
                    onClose={() => setShowManageModal(false)}
                    onCancelClick={() => {
                        setShowManageModal(false);
                        console.log('Cancel subscription clicked');
                    }}
                    onUpdatePaymentClick={handleUpdatePaymentMethod}
                    currentPaymentMethod="Visa •••• 4242"
                />
            </>
        )
      }
    </>
  );
}
