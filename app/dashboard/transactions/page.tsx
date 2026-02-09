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
  const [renewalDateISO, setRenewalDateISO] = useState<string | null>(null); // ISO date for UpgradeConfirmation
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'canceled'>('active');
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<Tier | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [transactionSortOrder, setTransactionSortOrder] = useState<'asc' | 'desc'>('desc');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<{ brand: string; last4: string } | null>(null);
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

  // Sort transactions based on sortOrder
  const sortedTransactions = [...transactions].sort((a, b) => {
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
        // Use the helper function that handles browser-only initialization
        const { getUserWithPaymentMethod } = await import('@/lib/firestore');
        const userData = await getUserWithPaymentMethod(user.uid);
        
        if (userData) {
          // Set tier and status
          setCurrentTier(userData.subscription.tier as Tier);
          setSubscriptionStatus(userData.subscription.status as 'active' | 'canceled');
          
          // Handle renewal date
          const dateToFormat = userData.subscription.status === 'canceled' 
            ? userData.subscription.expiresAt 
            : userData.subscription.renewalDate;
          
          if (dateToFormat) {
            // Store ISO date string for UpgradeConfirmation
            setRenewalDateISO(dateToFormat);
            
            // Format for display
            const date = new Date(dateToFormat);
            setRenewalDate(date.toLocaleDateString('en-US', { 
              month: 'numeric', 
              day: 'numeric', 
              year: '2-digit' 
            }));
          }
          
          // Set payment method
          if (userData.paymentMethod) {
            setPaymentMethod({
              brand: userData.paymentMethod.brand,
              last4: userData.paymentMethod.last4
            });
            console.log('✅ Payment method loaded:', userData.paymentMethod.brand, '****' + userData.paymentMethod.last4);
          } else {
            setPaymentMethod(null);
            console.log('⚠️ No payment method on file');
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

  // Fetch user's invoice history from Stripe
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.uid) return;
      
      setIsLoadingTransactions(true);
      
      try {
        // Import the pre-initialized auth instance
        const { auth } = await import('@/lib/firebase');
        
        if (!auth) {
          console.error('Firebase auth not initialized');
          setIsLoadingTransactions(false);
          return;
        }
        
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.error('User not authenticated');
          setIsLoadingTransactions(false);
          return;
        }
        
        const token = await currentUser.getIdToken();

        // Call get-invoices API
        const response = await fetch('/api/stripe/get-invoices', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch invoices');
        }

        // Set transactions from API response
        setTransactions(data.invoices || []);
        console.log(`✅ Loaded ${data.invoices?.length || 0} invoices`);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        // Don't show error notification - just show empty state
        // User experience: show empty state rather than scary error message
        setTransactions([]);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchInvoices();
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
          
          {isLoadingTransactions ? (
            // Loading state
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9be382]"></div>
              <p className="ml-3 text-gray-600">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            // Empty state
            <div className="text-center py-12 text-gray-500">
              <p className="text-base">No transactions yet</p>
              <p className="text-sm mt-2">Your billing history will appear here after your first payment.</p>
            </div>
          ) : (
            // Transactions table
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <TransactionsTable 
                transactions={sortedTransactions}
                sortOrder={transactionSortOrder}
                onSortChange={handleToggleSort}
                onDownload={handleDownloadInvoice}
              />
            </div>
          )}
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
                        paymentMethod={paymentMethod}
                        renewalDate={renewalDateISO}
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
                    currentPaymentMethod={paymentMethod ? `${paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)} •••• ${paymentMethod.last4}` : 'No payment method on file'}
                />
            </>
        )
      }
    </>
  );
}
