'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { getSubscriptionForUser, Subscription, cancelSubscription, switchToSafetyNet } from '@/lib/stripe/subscriptions';
import { getTransactionsForUser } from '@/lib/stripe/transactions';
import type { Transaction } from './transactions.d';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DashboardNav } from '@/components/layout/DashboardNav';
import ManageSubscriptionModal from '@/components/modals/ManageSubscriptionModal';
import CancelConfirmModal from '@/components/modals/CancelConfirmModal';
import SafetyNetDownsellModal from '@/components/modals/SafetyNetDownsellModal';

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<'closed' | 'manage' | 'confirm' | 'downsell'>('closed');
  const [selectedCancellationReason, setSelectedCancellationReason] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; show: boolean }>({
    type: 'success',
    message: '',
    show: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        getSubscriptionForUser(user.uid),
        getTransactionsForUser(user.uid),
      ])
        .then(([sub, trans]) => {
          setSubscription(sub);
          setTransactions(trans);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  function formatDate(date: Date | undefined): string {
    if (!date || !(date instanceof Date)) {
      return 'N/A';
    }
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  const formatAmount = (amount: number | undefined) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    return `$${(amount / 100).toFixed(2)}`;
  };

  const getSubscriptionPrice = (tier: string, billingFrequency: string) => {
    const priceMap: Record<string, Record<string, string>> = {
      essential: {
        monthly: '$69.00',
        quarterly: '$207.00',
        yearly: '$679.00'
      },
      advanced: {
        monthly: '$129.00',
        quarterly: '$387.00',
        yearly: '$1,299.00'
      },
      premium: {
        monthly: '$259.00',
        quarterly: '$777.00',
        yearly: '$2,599.00'
      },
      safety_net: {
        yearly: '$299.00'
      }
    };
    
    return priceMap[tier]?.[billingFrequency] || '$0.00';
  };

  const getStatusBadge = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Active</span>;
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">Cancelled</span>;
      case 'expired':
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">Expired</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">Unknown</span>;
    }
  };

  const getTransactionStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Completed</span>;
      case 'failed':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">Failed</span>;
      case 'pending':
        return <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Pending</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">Unknown</span>;
    }
  }

  const closeAllModals = () => {
    setModalState('closed');
    setSelectedCancellationReason(null);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message, show: true });
    setTimeout(() => {
      setNotification({ type, message, show: false });
    }, 5000);
  };

  const refreshSubscription = async () => {
    if (user) {
      const sub = await getSubscriptionForUser(user.uid);
      setSubscription(sub);
    }
  };

  const handleManageClick = () => {
    setModalState('manage');
  };

  const handleCancelClick = () => {
    setModalState('confirm');
  };

  const handleKeepSubscription = () => {
    closeAllModals();
  };

  const handleContinueToDownsell = (reason: string) => {
    setSelectedCancellationReason(reason);
    setModalState('downsell');
  };

  const handleClaimOffer = async () => {
    if (!user || !subscription?.stripeSubscriptionId || !selectedCancellationReason) return;
    
    try {
      const result = await switchToSafetyNet(
        user.uid,
        subscription.stripeSubscriptionId,
        selectedCancellationReason
      );
      
      if (result.success) {
        showNotification('success', 'Successfully switched to Safety Net Plan!');
        closeAllModals();
        await refreshSubscription();
      } else {
        showNotification('error', result.error || 'Failed to switch to Safety Net');
      }
    } catch (error: any) {
      showNotification('error', error.message || 'An error occurred');
    }
  };

  const handleFinalCancellation = async () => {
    if (!user || !subscription?.stripeSubscriptionId || !selectedCancellationReason) return;
    
    try {
      const result = await cancelSubscription(
        user.uid,
        subscription.stripeSubscriptionId,
        selectedCancellationReason
      );
      
      if (result.success) {
        showNotification('success', 'Subscription cancelled. Access until end of period.');
        closeAllModals();
        await refreshSubscription();
      } else {
        showNotification('error', result.error || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      showNotification('error', error.message || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1] p-4">
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {notification.message}
        </div>
      )}
      <DashboardNav />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#232521]">Transactions</h1>
          <PrimaryButton href="/pricing">
            Upgrade My Subscription
          </PrimaryButton>
        </div>

        {/* Active Subscription Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-[#232521] mb-4">My Active Subscription</h2>
          {loading ? (
            <p>Loading subscription...</p>
          ) : subscription ? (
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg text-[#232521]">
                    Genie Maintenance - {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
                  </p>
                  <p className="text-gray-500">
                    {subscription.status === 'active' ? 'Renews on' : 'Ended on'} {formatDate(subscription.endDate)}
                  </p>
                </div>
                <div className="text-right">
                <p className="text-xl font-bold text-[#232521]">{getSubscriptionPrice(subscription.tier, subscription.billingFrequency || 'yearly')}<span className="text-sm font-normal text-gray-500">/{subscription.billingFrequency?.replace('ly', '') || 'year'}</span></p>
                  {getStatusBadge(subscription.status)}
                </div>
              </div>
              {subscription.status === 'expired' && <p className="text-yellow-600 text-sm mt-2">Your subscription has expired. Please renew to continue service.</p>}
              <div className="mt-6">
                <SecondaryButton onClick={handleManageClick}>
                  Manage Subscription
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No active subscription</p>
              <SecondaryButton href="/pricing">
                Choose a Plan
              </SecondaryButton>
            </div>
          )}
        </div>

        {/* Transaction History Table */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#232521] mb-4">Transaction History</h2>
          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.orderId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(transaction.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatAmount(transaction.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{getTransactionStatusBadge(transaction.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.paymentMethodBrand} •••• {transaction.paymentMethodLast4}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => window.open(transaction.invoiceUrl, '_blank')}
                          disabled={transaction.status !== 'completed' || !transaction.invoiceUrl}
                          className="text-[#1b4a41] hover:text-opacity-80 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-2">Your transaction history will appear here once you make your first payment.</p>
            </div>
          )}
        </div>
      </main>

      <ManageSubscriptionModal
        isOpen={modalState === 'manage'}
        onClose={closeAllModals}
        onCancelClick={handleCancelClick}
        currentPaymentMethod="Visa •••• 4242"
      />

      <CancelConfirmModal
        isOpen={modalState === 'confirm'}
        onClose={closeAllModals}
        onKeepSubscription={handleKeepSubscription}
        onContinue={handleContinueToDownsell}
      />

      <SafetyNetDownsellModal
        isOpen={modalState === 'downsell'}
        onClose={closeAllModals}
        onClaimOffer={handleClaimOffer}
        onCancelSubscription={handleFinalCancellation}
        currentPrice={subscription ? getSubscriptionPrice(subscription.tier, subscription.billingFrequency || 'yearly') : '$679.00'}
        renewalDate={subscription ? formatDate(subscription.endDate) : 'N/A'}
      />
    </div>
  );
}
