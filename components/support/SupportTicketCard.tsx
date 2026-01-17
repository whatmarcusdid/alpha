'use client';

import type { SupportTicket, TicketStatus } from '@/types/support';
import { getStatusColors } from '@/types/support';

interface SupportTicketCardProps {
  ticket?: SupportTicket;
  variant?: 'default' | 'empty';
  onClick?: () => void;
}

/**
 * SupportTicketCard displays a support ticket with its status, assignment, and timestamps
 * Used in the Support Hub to show active and past tickets
 */
export default function SupportTicketCard({
  ticket,
  variant = 'default',
  onClick,
}: SupportTicketCardProps) {
  // Empty state
  if (variant === 'empty' || !ticket) {
    return (
      <div className="flex flex-col items-center p-4 rounded w-fit">
        <div className="flex flex-col gap-2 items-start text-center max-w-[400px]">
          <div className="flex flex-col justify-center w-full">
            <p className="text-[15px] font-bold text-[#232521] leading-[26px]">
              All clear!
            </p>
          </div>
          <div className="flex flex-col justify-center w-full">
            <p className="text-[15px] font-medium text-[#545552] leading-[1.2] tracking-[-0.15px]">
              No active support requests. We're here when you need us—just submit a request below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get status badge colors
  const statusColors = getStatusColors(ticket.status);
  
  // Format dates
  const formatDate = (date: any) => {
    if (!date) return '';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (date: any) => {
    if (!date) return '';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `Updated ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `Updated ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `Updated ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  return (
    <div
      className={`
        bg-[#FAF9F5] 
        border border-[rgba(111,121,122,0.4)] 
        rounded 
        flex flex-col 
        gap-2 
        items-start 
        p-4 
        w-full
        ${onClick ? 'cursor-pointer hover:border-[rgba(111,121,122,0.6)] transition-colors' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Title and Status Badge */}
      <div className="flex items-start justify-between w-full">
        <p className="font-bold text-[16px] text-[#232521] leading-[1.5] tracking-[-0.16px] flex-1">
          {ticket.title}
        </p>
        <div
          className="flex items-center justify-center px-2 py-1 rounded-full shrink-0 ml-2"
          style={{
            backgroundColor: statusColors.bg,
          }}
        >
          <p
            className="font-medium text-[13px] leading-[1.5]"
            style={{
              color: statusColors.text,
            }}
          >
            {ticket.status}
          </p>
        </div>
      </div>

      {/* Ticket ID */}
      <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-[-0.15px] w-full">
        ID: {ticket.ticketId}
      </p>

      {/* Assignment */}
      {ticket.assignedAgentName && (
        <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-[-0.15px] w-full">
          Assigned to: {ticket.assignedAgentName}
        </p>
      )}

      {/* Timestamps */}
      <div className="flex font-medium gap-2 items-start text-[15px] text-[#545552] leading-[1.2] tracking-[-0.15px] w-full">
        <p>{formatTimeAgo(ticket.lastUpdatedAt)}</p>
        <p>•</p>
        <p>Created {formatDate(ticket.createdAt)}</p>
      </div>
    </div>
  );
}
