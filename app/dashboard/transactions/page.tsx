'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { getSubscriptionForUser, Subscription } from '@/lib/stripe/subscription';
import { getTransactionsForUser, Transaction } from '@/lib/stripe/transactions';
import { DashboardNav } from '@/components/layout/DashboardNav';

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Active</span>;
      case 'past_due':
        return <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Past Due</span>;
      case 'canceled':
      case 'unpaid':
      case 'cancel_at_period_end':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">Canceled</span>;
    }
  };

  const getTransactionStatusBadge = (status: Transaction['status']) => {
     switch (status) {
      case 'completed':
        return <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Completed</span>;
      case 'failed':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">Failed</span>;
      case 'processing':
         return <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Processing</span>;
       case 'refunded':
         return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">Refunded</span>;
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F1] p-4">
      <DashboardNav />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#232521]">Transactions</h1>
          <Link 
            href="/pricing"
            className="bg-[#9be382] text-[#232521] font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-opacity-90 transition-colors"
          >
            Upgrade My Subscription
          </Link>
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
                  <p className="font-semibold text-lg text-[#232521]">{subscription.planName}</p>
                  <p className="text-gray-500">Renews on {formatDate(subscription.renewalDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#232521]">{formatAmount(subscription.amount)}<span className="text-sm font-normal text-gray-500">/{subscription.planCadence.replace('ly','')}</span></p>
                  {getStatusBadge(subscription.status)}
                </div>
              </div>
              {subscription.status === 'past_due' && <p className="text-yellow-600 text-sm mt-2">Please update your payment method to keep your account active.</p>}
              <div className="mt-6">
                 <button onClick={() => alert('Redirecting to Stripe to manage subscription (MVP)')} className="bg-white border border-gray-300 text-[#232521] font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">Manage Subscription</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No active subscription</p>
              <Link 
                href="/pricing"
                className="bg-[#1b4a41] text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-opacity-90 transition-colors"
              >
                Choose a Plan
              </Link>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.paymentMethod.brand} •••• {transaction.paymentMethod.last4}</td>
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
    </div>
  );
}
