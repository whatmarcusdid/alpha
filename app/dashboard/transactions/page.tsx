'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PlanSelectionModal from '@/components/upgrade/PlanSelectionModal';
import UpgradeConfirmation from '@/components/upgrade/UpgradeConfirmation';
import ManageSubscriptionModal from '@/components/manage/ManageSubscriptionModal';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { TransactionsTable, Transaction } from '@/components/transactions/TransactionsTable';

type Tier = 'essential' | 'advanced' | 'premium' | 'safety-net';

const tierNames: Record<Tier, string> = {
  'safety-net': 'Safety Net',
  essential: 'Essential',
  advanced: 'Advanced',
  premium: 'Premium',
};

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [currentTier, setCurrentTier] = useState<Tier>('essential'); // Default tier
  const [renewalDate, setRenewalDate] = useState<string>('6/15/26');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'canceled'>('active');
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<Tier | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [transactionSortOrder, setTransactionSortOrder] = useState<'asc' | 'desc'>('desc');
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

  // Mock transaction data - In production, this would be fetched from Firestore/Stripe
  const mockTransactions: Transaction[] = [
    {
      id: "txn-001",
      orderId: "#BCC-001205",
      description: `Genie Maintenance - ${tierNames[currentTier]} Plan`,
      date: "06-15-2024",
      amount: "$679.00",
      status: "completed",
      paymentMethod: "•••• 4242",
      invoiceUrl: "https://example.com/invoice-001205.pdf"
    },
    {
      id: "txn-002",
      orderId: "#BCC-001189",
      description: `Genie Maintenance - ${tierNames[currentTier]} Plan`,
      date: "06-15-2023",
      amount: "$679.00",
      status: "completed",
      paymentMethod: "•••• 4242",
      invoiceUrl: "https://example.com/invoice-001189.pdf"
    },
    {
      id: "txn-003",
      orderId: "#BCC-001173",
      description: `Genie Maintenance - ${tierNames[currentTier]} Plan`,
      date: "06-15-2022",
      amount: "$679.00",
      status: "completed",
      paymentMethod: "•••• 4242",
      invoiceUrl: "https://example.com/invoice-001173.pdf"
    }
  ];

  // Sort transactions based on sortOrder
  const sortedTransactions = [...mockTransactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return transactionSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch user's subscription data from Firestore
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!user?.uid) return;
      
      try {
        const { getUserSubscription } = await import('@/lib/firestore');
        const subscription = await getUserSubscription(user.uid);
        
        if (subscription) {
          // Map Firestore tier to component tier type
          const tier = subscription.tier as Tier;
          setCurrentTier(tier);
          setSubscriptionStatus(subscription.status as 'active' | 'canceled');
          
          // Format renewal or expiration date based on status
          const dateToFormat = subscription.status === 'canceled' 
            ? subscription.expiresAt 
            : subscription.renewalDate;
          
          if (dateToFormat) {
            const date = new Date(dateToFormat);
            setRenewalDate(date.toLocaleDateString('en-US', { 
              month: 'numeric', 
              day: 'numeric', 
              year: '2-digit' 
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscriptionData();
  }, [user?.uid]);

  const handleSelectPlan = (tier: Tier) => {
    setSelectedUpgradeTier(tier);
    setShowUpgradeModal(false);
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

  const handleDownloadInvoice = (transaction: Transaction) => {
    if (transaction.invoiceUrl) {
      window.open(transaction.invoiceUrl, '_blank');
    } else {
      // In production, you might fetch the invoice from Stripe
      console.log('Downloading invoice for:', transaction.orderId);
      setNotification({ 
        type: 'error', 
        show: true,
        message: 'Invoice not available',
        subtitle: 'Please contact support to request your invoice.'
      });
    }
  };

  const handleToggleSort = () => {
    setTransactionSortOrder(transactionSortOrder === 'asc' ? 'desc' : 'asc');
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

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#232521]">Transactions</h1>
          </div>
          <div className="mt-4 sm:mt-0">
            <PrimaryButton onClick={() => setShowUpgradeModal(true)}>
              Upgrade My Subscription
            </PrimaryButton>
          </div>
        </div>

        {/* My Active Subscription Section */}
        <div className="flex flex-col gap-6 mb-8">
          <h2 className="text-2xl font-extrabold text-[#0a0a0a] leading-[1.2] tracking-tight">
            My Active Subscription
          </h2>
          
          <div className="bg-white border border-[rgba(111,121,122,0.4)] rounded p-4 flex gap-6 items-center">
            {/* Left Content */}
            <div className="flex-1 flex flex-col gap-3">
              <h3 className="text-base font-bold text-[#232521] leading-[1.5] tracking-tight">
                Genie Maintenance - {tierNames[currentTier]} Plan
              </h3>
              
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-[#545552] leading-[1.5]">
                  Current Status
                </p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium leading-[1.2] tracking-tight ${
                  subscriptionStatus === 'active' 
                    ? 'bg-[#dcfce7] text-[#14532d]' 
                    : 'bg-[#fee2e2] text-[#991b1b]'
                }`}>
                  {subscriptionStatus === 'active' ? 'Active' : 'Canceled'}
                </span>
              </div>
              
              <p className="text-[15px] font-medium text-[#232521] leading-[1.2] tracking-tight">
                {subscriptionStatus === 'active' 
                  ? `Plan renews on ${renewalDate}` 
                  : `Plan expires on ${renewalDate}`}
              </p>
            </div>
            
            {/* Right Button */}
            <div>
              <SecondaryButton onClick={() => setShowManageModal(true)}>
                Manage Subscription
              </SecondaryButton>
            </div>
          </div>
        </div>

        {/* Billing History Section */}
        <div className="flex flex-col gap-6 mb-8 p-5 rounded bg-white h-full border border-[#DADADA]">
          <h2 className="text-[15px] font-bold leading-relaxed tracking-tight text-[#232521]">
            Billing History
          </h2>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <TransactionsTable 
              transactions={sortedTransactions}
              sortOrder={transactionSortOrder}
              onSortChange={handleToggleSort}
              onDownload={handleDownloadInvoice}
            />
          </div>
        </div>

      </main>

      {
        currentTier && (
            <>
                <PlanSelectionModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    currentTier={currentTier === 'safety-net' ? 'essential' : currentTier as 'essential' | 'advanced' | 'premium'}
                    onSelectPlan={(tier) => handleSelectPlan(tier as Tier)}
                    isCanceled={subscriptionStatus === 'canceled'}
                />

                {selectedUpgradeTier && selectedUpgradeTier !== 'safety-net' && (
                    <UpgradeConfirmation
                        isOpen={showConfirmation}
                        onClose={() => {
                            setShowConfirmation(false);
                            setSelectedUpgradeTier(null);
                        }}
                        currentTier={currentTier === 'safety-net' ? 'essential' : currentTier as 'essential' | 'advanced' | 'premium'}
                        newTier={selectedUpgradeTier as 'essential' | 'advanced' | 'premium'}
                        userId={user?.uid || ''}
                        onSuccess={handleUpgradeSuccess}
                        onError={handleUpgradeError}
                        onChangePlan={() => {
                            setShowConfirmation(false);
                            setShowUpgradeModal(true);
                        }}
                        isReactivation={subscriptionStatus === 'canceled'}
                    />
                )}

                <ManageSubscriptionModal
                    isOpen={showManageModal}
                    onClose={() => setShowManageModal(false)}
                    onCancelClick={(reason) => {
                        setShowManageModal(false);
                        console.log('Cancel subscription clicked with reason:', reason);
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
