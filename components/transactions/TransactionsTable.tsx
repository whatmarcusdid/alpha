'use client';

import React from 'react';
import { TertiaryButton } from '@/components/ui/TertiaryButton';
import { ChevronDown } from 'lucide-react';

export type TransactionStatus = 'completed' | 'failed' | 'pending';

export interface Transaction {
  id: string;
  orderId: string;
  description: string;
  date: string;
  amount: string;
  status: TransactionStatus;
  paymentMethod: string;
  invoiceUrl?: string;
}

export interface TransactionsTableProps {
  transactions: Transaction[];
  onDownload?: (transaction: Transaction) => void;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  onDownload,
  sortOrder = 'desc',
  onSortChange,
}) => {
  const handleDownload = (transaction: Transaction) => {
    if (onDownload) {
      onDownload(transaction);
    } else if (transaction.invoiceUrl) {
      window.open(transaction.invoiceUrl, '_blank');
    }
  };

  const getStatusBadgeClasses = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-[#dcfce7] text-[#14532d]';
      case 'failed':
        return 'bg-[#feebeb] text-[#e10e0e]';
      case 'pending':
        return 'bg-[#fef3c7] text-[#92400e]';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white w-full">
      {/* Table Header */}
      <div className="bg-[#F7F6F1] flex items-center gap-6 px-5 py-1 w-full rounded-tl rounded-tr">
        {/* Order ID - Always visible */}
        <button
          onClick={onSortChange}
          className="flex items-center gap-1 py-1 rounded-md w-[125px] hover:opacity-70 transition-opacity"
        >
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
            Order ID
          </p>
          <ChevronDown 
            size={20} 
            className={`text-[#232521] transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Description - Hidden on mobile */}
        <div className="hidden sm:flex items-center py-1 rounded-md flex-1 min-w-0">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
            Description
          </p>
        </div>

        {/* Date - Hidden on tablet-744 and mobile */}
        <div className="hidden lg:flex items-center py-1 rounded-md w-[150px]">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
            Date
          </p>
        </div>

        {/* Amount - Hidden on mobile */}
        <div className="hidden sm:flex items-center py-1 rounded-md w-[150px]">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
            Amount
          </p>
        </div>

        {/* Status - Hidden on tablet-1024, tablet-744, and mobile */}
        <div className="hidden xl:flex items-center py-1 rounded-md w-[150px]">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
            Status
          </p>
        </div>

        {/* Payment Method - Hidden on tablet-1024, tablet-744, and mobile */}
        <div className="hidden xl:flex items-center py-1 rounded-md w-[135px]">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
            Payment Method
          </p>
        </div>

        {/* Action - Always visible */}
        <div className="flex items-center py-1 rounded-md w-[77px]">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
            Action
          </p>
        </div>
      </div>

      {/* Table Rows */}
      <div className="flex flex-col">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-white border-b border-[#dadada] flex items-center gap-6 px-5 py-3 w-full hover:bg-[#F2F0E7] transition-colors"
          >
            {/* Order ID - Always visible */}
            <p className="font-normal text-[15px] text-[#232521] leading-[1.5] tracking-tight w-[125px]">
              {transaction.orderId}
            </p>

            {/* Description - Hidden on mobile */}
            <p className="hidden sm:block font-normal text-[15px] text-[#232521] leading-[1.5] tracking-tight flex-1 min-w-0 truncate">
              {transaction.description}
            </p>

            {/* Date - Hidden on tablet-744 and mobile */}
            <p className="hidden lg:block font-normal text-[15px] text-[#232521] leading-[1.5] tracking-tight w-[150px]">
              {transaction.date}
            </p>

            {/* Amount - Hidden on mobile */}
            <p className="hidden sm:block font-normal text-[15px] text-[#232521] leading-[1.5] tracking-tight w-[150px]">
              {transaction.amount}
            </p>

            {/* Status - Hidden on tablet-1024, tablet-744, and mobile */}
            <div className="hidden xl:flex items-start w-[150px]">
              <div className={`flex items-center justify-center px-2 py-1 rounded-full ${getStatusBadgeClasses(transaction.status)}`}>
                <p className="font-medium text-[13px] leading-[1.5] whitespace-nowrap">
                  {getStatusLabel(transaction.status)}
                </p>
              </div>
            </div>

            {/* Payment Method - Hidden on tablet-1024, tablet-744, and mobile */}
            <p className="hidden xl:block font-normal text-[15px] text-[#232521] leading-[1.5] tracking-tight w-[135px]">
              {transaction.paymentMethod}
            </p>

            {/* Action - Always visible */}
            <div className="flex items-center justify-center w-[77px]">
              <TertiaryButton onClick={() => handleDownload(transaction)}>
                Download
              </TertiaryButton>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {transactions.length === 0 && (
        <div className="bg-white border-b border-[#dadada] flex items-center justify-center p-12 w-full">
          <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-tight">
            No transactions available
          </p>
        </div>
      )}
    </div>
  );
};

