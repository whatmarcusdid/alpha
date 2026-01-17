'use client';

import type { SupportTicket } from '@/types/support';
import { getStatusColors } from '@/types/support';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

interface PastSupportTicketsTableProps {
  tickets: SupportTicket[];
  onDownload?: (ticket: SupportTicket) => void;
}

/**
 * PastSupportTicketsTable - Displays a table of resolved/closed support tickets
 * Used in the Support Hub to show historical tickets with download capability
 */
export default function PastSupportTicketsTable({
  tickets,
  onDownload,
}: PastSupportTicketsTableProps) {
  // Format date helper
  const formatDate = (date: any) => {
    if (!date) return '—';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Empty state
  if (tickets.length === 0) {
    return (
      <div className="bg-white border border-[rgba(111,121,122,0.4)] rounded">
        {/* Table Header */}
        <div className="bg-[#F7F6F1] border-b border-[rgba(111,121,122,0.4)] flex gap-4 items-center p-[18px]">
          <div className="w-[300px]">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
              Ticket ID
            </p>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
              Description
            </p>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
              Status
            </p>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
              Created
            </p>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
              Resolved
            </p>
          </div>
          <div className="w-[80px]">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
              Action
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="p-12 text-center">
          <p className="text-[15px] font-medium text-[#545552]">
            No past tickets available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[rgba(111,121,122,0.4)] rounded overflow-hidden">
      {/* Table Header */}
      <div className="bg-[#F7F6F1] border-b border-[rgba(111,121,122,0.4)] flex gap-4 items-center p-[18px]">
        <div className="w-[300px]">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
            Ticket ID
          </p>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
            Description
          </p>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
            Status
          </p>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
            Created
          </p>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
            Resolved
          </p>
        </div>
        <div className="w-[80px]">
          <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-[-0.15px]">
            Action
          </p>
        </div>
      </div>

      {/* Table Rows */}
      {tickets.map((ticket) => {
        const statusColors = getStatusColors(ticket.status);
        const resolvedDate = ticket.resolvedAt || ticket.closedAt;

        return (
          <div
            key={ticket.ticketId}
            className="
              bg-white
              hover:bg-[#F2F0E7]
              border-b border-l border-r border-[rgba(111,121,122,0.4)]
              flex gap-4 items-center p-[18px]
              transition-colors
              cursor-pointer
            "
          >
            {/* Ticket ID */}
            <div className="w-[300px] flex gap-4 items-center">
              <div className="flex flex-col items-start">
                <p className="font-bold text-[16px] text-[#232521] leading-[1.5] tracking-[-0.16px]">
                  {ticket.ticketId}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="flex-1">
              <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-[-0.15px]">
                {ticket.title}
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex-1">
              <div
                className="inline-flex items-center justify-center px-2 py-1 rounded-full"
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

            {/* Created Date */}
            <div className="flex-1">
              <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-[-0.15px]">
                {formatDate(ticket.createdAt)}
              </p>
            </div>

            {/* Resolved Date */}
            <div className="flex-1">
              <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-[-0.15px]">
                {formatDate(resolvedDate)}
              </p>
            </div>

            {/* Download Action */}
            <div className="w-[80px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload?.(ticket);
                }}
                className="
                  flex items-center justify-center
                  h-6 w-full
                  rounded-md
                  font-bold text-[16px] leading-[1.5]
                  text-[#1B4A41]
                  hover:underline
                  transition-all
                "
              >
                Download
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
