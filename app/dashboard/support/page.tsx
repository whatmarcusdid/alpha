'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { validateFile } from '@/lib/firebase/storage';
import { createSupportTicket, TicketCategory, TicketUrgency } from '@/lib/support/client';
import {
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  PaperClipIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { PageCard } from '@/components/layout/PageCard';
import HorizontalTabs, { TabItem } from '@/components/ui/HorizontalTabs';
import SupportTicketCard from '@/components/support/SupportTicketCard';
import PastSupportTicketsTable from '@/components/support/PastSupportTicketsTable';
import TicketDetailModal from '@/components/support/TicketDetailModal';
import { getActiveTickets, getPastTickets } from '@/lib/firestore/support';
import type { SupportTicket } from '@/types/support';

const CATEGORY_OPTIONS: { value: TicketCategory; label: string; description: string }[] = [
  { value: 'Bug Report', label: 'Bug Report', description: 'Something is broken or not working correctly' },
  { value: 'Updates', label: 'Content Update', description: 'Request changes to your website content' },
  { value: 'Question', label: 'Question', description: 'General questions about your website or service' },
  { value: 'Feature Request', label: 'Feature Request', description: 'Suggest a new feature or improvement' },
  { value: 'Other', label: 'Other', description: 'Anything else not covered above' },
];

const URGENCY_OPTIONS: { value: TicketUrgency; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'No rush - whenever you get to it' },
  { value: 'normal', label: 'Normal', description: 'Standard priority - within 24 hours' },
  { value: 'high', label: 'High', description: 'Important - please prioritize' },
  { value: 'urgent', label: 'Urgent', description: 'Site is down or losing leads' },
];

export default function SupportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'tickets'>('request');
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Question');
  const [urgency, setUrgency] = useState<TicketUrgency>('normal');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeTickets, setActiveTickets] = useState<SupportTicket[]>([]);
  const [pastTickets, setPastTickets] = useState<SupportTicket[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
    subtitle?: string;
  }>({ show: false, type: 'success', message: '' });

  const tabs: TabItem[] = [
    { id: 'request', label: 'Support Request' },
    { id: 'tickets', label: 'Past Support Tickets' },
  ];

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchActiveTickets = useCallback(async () => {
    if (!user) return;
    
    setLoadingActive(true);
    try {
      const result = await getActiveTickets(user.uid);
      if (result.success && result.tickets) {
        setActiveTickets(result.tickets);
      }
    } catch (error) {
      console.error('Error fetching active tickets:', error);
    } finally {
      setLoadingActive(false);
    }
  }, [user]);

  const fetchPastTickets = useCallback(async () => {
    if (!user) return;
    
    setLoadingPast(true);
    try {
      const result = await getPastTickets(user.uid);
      if (result.success && result.tickets) {
        setPastTickets(result.tickets);
      }
    } catch (error) {
      console.error('Error fetching past tickets:', error);
    } finally {
      setLoadingPast(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'request' && user) {
      fetchActiveTickets();
    }
  }, [activeTab, user, fetchActiveTickets]);

  useEffect(() => {
    if (activeTab === 'tickets' && user) {
      fetchPastTickets();
    }
  }, [activeTab, user, fetchPastTickets]);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('(555) 123-4567');
    setNotification({ show: true, type: 'success', message: 'Copied to clipboard!' });
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@tradesitegenie.com');
    setNotification({ show: true, type: 'success', message: 'Copied to clipboard!' });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(Array.from(event.target.files));
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleFiles(Array.from(event.dataTransfer.files));
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setNotification({ show: true, type: 'error', message: 'Invalid File', subtitle: validation.error });
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Question');
    setUrgency('normal');
    setDescription('');
    setAttachments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Authentication required',
        subtitle: 'You must be logged in to submit a support request.'
      });
      return;
    }

    if (!title.trim()) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Title required',
        subtitle: 'Please provide a brief title for your request.'
      });
      return;
    }

    if (!description.trim() || description.trim().length < 20) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Description required',
        subtitle: 'Please provide more details about your issue (minimum 20 characters).'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!storage) {
        setNotification({
          show: true,
          type: 'error',
          message: 'Storage not available',
          subtitle: 'Please refresh the page and try again.'
        });
        setIsSubmitting(false);
        return;
      }

      const uploadedUrls: string[] = [];
      
      for (const file of attachments) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const storageRef = ref(storage, `support-attachments/${user.uid}/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        uploadedUrls.push(downloadUrl);
      }

      const result = await createSupportTicket({
        title: title.trim(),
        category,
        urgency,
        description: description.trim(),
        attachmentUrls: uploadedUrls,
      });

      if (!result.success) {
        setNotification({
          show: true,
          type: 'error',
          message: 'Submission failed',
          subtitle: result.error || 'Please try again or email support@tradesitegenie.com directly.'
        });
        return;
      }

      setNotification({
        show: true,
        type: 'success',
        message: 'Support request submitted!',
        subtitle: `Ticket ${result.ticketId} created. Check your email for confirmation.`
      });
      
      resetForm();
      fetchActiveTickets();

    } catch (error: any) {
      console.error('Submission error:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'Submission error',
        subtitle: error.message || 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <NotificationToast
        show={notification.show}
        type={notification.type}
        message={notification.message}
        subtitle={notification.subtitle}
        onDismiss={() => setNotification({ show: false, type: 'success', message: '' })}
      />

      <main className="min-h-screen bg-[#F7F6F1] px-4 sm:px-6 lg:px-8 py-8">
        <PageCard>
          <h1 className="text-2xl font-bold text-[#232521] mb-6">Support Hub</h1>

          <div className="mb-8">
            <HorizontalTabs
              tabs={tabs}
              activeTabId={activeTab}
              onChange={(tabId) => setActiveTab(tabId as 'request' | 'tickets')}
            />
          </div>

          {activeTab === 'request' && (
            <>
              <div className="mb-8 flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-[#232521]">Active Tickets</h2>
                <p className="text-sm leading-relaxed tracking-tight text-gray-600">
                  Track your open support requests below. You'll receive email updates when we respond.
                </p>
                
                <div className="flex flex-col gap-4 w-full justify-start items-start mt-2">
                  {loadingActive ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-full bg-[#FAF9F5] rounded border border-gray-200 p-4 animate-pulse">
                          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      ))}
                    </>
                  ) : activeTickets.length > 0 ? (
                    activeTickets.map((ticket) => (
                      <SupportTicketCard
                        key={ticket.ticketId}
                        ticket={ticket}
                        onClick={() => setSelectedTicket(ticket)}
                      />
                    ))
                  ) : (
                    <SupportTicketCard variant="empty" />
                  )}
                </div>
              </div>

              <div className="mb-6 flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-[#232521]">Many ways to reach out</h2>
                <p className="text-sm leading-relaxed tracking-tight text-gray-600">
                  We're here when you need us.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                      <PhoneIcon className="h-6 w-6 text-[#1b4a41]"/>
                    </div>
                    <p className="font-semibold">(555) 123-4567</p>
                    <p className="text-xs text-gray-500">Mon–Fri, 9 AM–5 PM EST</p>
                    <SecondaryButton href="tel:+15551234567" className="mt-2">Call Number</SecondaryButton>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                      <DocumentTextIcon className="h-6 w-6 text-[#1b4a41]"/>
                    </div>
                    <p className="font-semibold">(555) 123-4567</p>
                    <p className="text-xs text-gray-500">Text Anytime</p>
                    <SecondaryButton onClick={handleCopyPhone} className="mt-2">Copy Number</SecondaryButton>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                      <EnvelopeIcon className="h-6 w-6 text-[#1b4a41]"/>
                    </div>
                    <p className="font-semibold">support@tradesitegenie.com</p>
                    <p className="text-xs text-gray-500">Email Anytime</p>
                    <SecondaryButton onClick={handleCopyEmail} className="mt-2">Copy Email</SecondaryButton>
                  </div>
                </div>
              </div>

              <div className="">
                <h2 className="text-xl font-semibold text-[#232521]">Submit a Support Request</h2>
                <p className="text-sm leading-relaxed tracking-tight text-gray-600 mt-1">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>
                
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Brief Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g., Homepage images not loading"
                      required
                      maxLength={200}
                      className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b4a41] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="category"
                          value={category}
                          onChange={e => setCategory(e.target.value as TicketCategory)}
                          className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b4a41] focus:border-transparent appearance-none pr-10"
                        >
                          {CATEGORY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {CATEGORY_OPTIONS.find(o => o.value === category)?.description}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
                        Urgency <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="urgency"
                          value={urgency}
                          onChange={e => setUrgency(e.target.value as TicketUrgency)}
                          className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b4a41] focus:border-transparent appearance-none pr-10"
                        >
                          {URGENCY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {URGENCY_OPTIONS.find(o => o.value === urgency)?.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Describe the Issue <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Please describe your issue in detail."
                      required
                      rows={5}
                      className="w-full min-h-[120px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b4a41] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {description.length < 20 
                        ? `Minimum 20 characters required (${20 - description.length} more needed)`
                        : `${description.length} characters`
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (optional)</label>
                    <div 
                      onDrop={handleDrop} 
                      onDragOver={e => e.preventDefault()} 
                      className="relative flex flex-col items-center justify-center w-full min-h-[120px] px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400 transition"
                    >
                      <PaperClipIcon className="h-8 w-8 text-gray-400 mb-2"/>
                      <p className="text-sm text-gray-600">Click or drag files to upload</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 50MB</p>
                      <input type="file" multiple onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                    </div>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                            <span className="text-sm text-gray-800">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveFile(index)} className="p-1 rounded-full hover:bg-gray-200">
                            <XMarkIcon className="h-4 w-4 text-gray-600"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <PrimaryButton type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            </>
          )}

          {activeTab === 'tickets' && (
            <div>
              <h2 className="text-2xl font-bold text-[#232521] mb-6">Past Support Tickets</h2>
              
              {loadingPast ? (
                <div className="bg-white border border-gray-200 rounded p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex gap-4">
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <PastSupportTicketsTable
                  tickets={pastTickets}
                  onDownload={(ticket) => {
                    console.log('Download ticket:', ticket.ticketId);
                    setNotification({
                      show: true,
                      type: 'success',
                      message: 'Download started',
                      subtitle: `Downloading report for ticket ${ticket.ticketId}`
                    });
                  }}
                />
              )}
            </div>
          )}
        </PageCard>
      </main>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onTicketUpdated={() => {
          fetchActiveTickets();
        }}
      />
    </>
  );
}
