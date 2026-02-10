'use client';

import { useState, useEffect, useRef } from 'react';
import { replyToTicket } from '@/lib/support/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { SupportTicket } from '@/types/support';

interface TicketDetailModalProps {
  ticket: SupportTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated?: () => void;
}

/**
 * Format date from Firestore Timestamp or ISO string
 */
function formatDate(date: any): string {
  if (!date) return 'Unknown date';
  
  try {
    // Handle Firestore Timestamp
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
}

/**
 * Get status badge colors
 */
function getStatusColors(status: string): { bg: string; text: string } {
  const statusMap: Record<string, { bg: string; text: string }> = {
    'open': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'in_progress': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'pending': { bg: 'bg-orange-100', text: 'text-orange-800' },
    'closed': { bg: 'bg-green-100', text: 'text-green-800' },
  };
  return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

/**
 * Get priority badge colors
 */
function getPriorityColors(priority: string): { bg: string; text: string } {
  const priorityMap: Record<string, { bg: string; text: string }> = {
    'Critical': { bg: 'bg-red-100', text: 'text-red-800' },
    'High': { bg: 'bg-orange-100', text: 'text-orange-800' },
    'Medium': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'Low': { bg: 'bg-gray-100', text: 'text-gray-800' },
  };
  return priorityMap[priority] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

export default function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  onTicketUpdated,
}: TicketDetailModalProps) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && ticket?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, ticket?.messages]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReplyText('');
      setError(null);
      setSuccess(false);
      setIsSending(false);
    }
  }, [isOpen]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSendReply = async () => {
    if (!ticket || !replyText.trim()) return;

    setError(null);
    setSuccess(false);
    setIsSending(true);

    try {
      const result = await replyToTicket(ticket.ticketId, replyText.trim());

      if (!result.success) {
        setError(result.error || 'Failed to send reply');
        return;
      }

      setSuccess(true);
      setReplyText('');
      
      // Callback to refresh ticket list
      if (onTicketUpdated) {
        onTicketUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !ticket) return null;

  const statusColors = getStatusColors(ticket.status);
  const priorityColors = getPriorityColors(ticket.priority);
  const isClosed = ticket.status === 'Closed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {ticket.ticketId}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.text}`}>
                  {ticket.status}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${priorityColors.bg} ${priorityColors.text}`}>
                  {ticket.priority}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[#232521] mb-2">
                {ticket.title}
              </h2>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-medium">{ticket.category}</span>
                <span>•</span>
                <span>Created {formatDate(ticket.createdAt)}</span>
                {ticket.assignedAgentName && (
                  <>
                    <span>•</span>
                    <span>Assigned to {ticket.assignedAgentName}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages Section */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
          {/* Initial message */}
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-[#1B4A41] text-white rounded-2xl rounded-tr-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold opacity-90">
                  {ticket.customerName || ticket.customerEmail || 'You'}
                </span>
                <span className="text-xs opacity-75">
                  {formatDate(ticket.createdAt)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Conversation messages */}
          {ticket.messages && ticket.messages.length > 0 && ticket.messages.map((message) => {
            const isUser = message.sender === 'user';
            
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-[#1B4A41] text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        isUser ? 'opacity-90' : 'text-gray-700'
                      }`}
                    >
                      {message.senderName}
                    </span>
                    {message.source === 'email' && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isUser
                            ? 'bg-white/20 text-white/90'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        via email
                      </span>
                    )}
                    <span
                      className={`text-xs ${
                        isUser ? 'opacity-75' : 'text-gray-500'
                      }`}
                    >
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  
                  {/* Attachments */}
                  {message.attachmentUrls && message.attachmentUrls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachmentUrls.map((url, index) => {
                        const fileName = decodeURIComponent(
                          url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`
                        );
                        return (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs underline block ${
                              isUser ? 'text-white/90' : 'text-blue-600'
                            }`}
                          >
                            📎 {fileName}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Form or Closed Message */}
        <div className="flex-shrink-0 border-t border-gray-200 p-6">
          {isClosed ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-2">This ticket has been closed.</p>
              <p className="text-sm text-gray-500">
                Need more help?{' '}
                <button
                  onClick={onClose}
                  className="text-[#1B4A41] underline hover:text-[#9be382]"
                >
                  Submit a new request
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Success Alert */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">Reply sent successfully!</p>
                </div>
              )}

              {/* Reply Textarea */}
              <div>
                <label htmlFor="reply" className="block text-sm font-medium text-gray-700 mb-2">
                  Add a reply
                </label>
                <textarea
                  id="reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={isSending}
                  placeholder="Type your reply here..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4A41] focus:border-transparent resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Send Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSendReply}
                  disabled={isSending || !replyText.trim()}
                  className="px-6 py-2 bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
