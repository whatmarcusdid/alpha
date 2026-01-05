'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { formatNotionProperties, NotionSupportRequest } from '@/lib/notion/support';
import { uploadSupportAttachment, validateFile } from '@/lib/firebase/storage';
import {
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  PaperClipIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { NotificationToast } from '@/components/ui/NotificationToast';

export default function SupportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requestFromEmail, setRequestFromEmail] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
    subtitle?: string;
  }>({ show: false, type: 'success', message: '' });

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
      if (user?.email) {
        setRequestFromEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

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
      const newFiles = Array.from(event.target.files);
      handleFiles(newFiles);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const newFiles = Array.from(event.dataTransfer.files);
    handleFiles(newFiles);
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
  }

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setDescription('');
    setAttachments([]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user) {
       setNotification({
         show: true,
         type: 'error',
         message: 'Support form submission failed',
         subtitle: 'You must be logged in to submit a request.'
       });
       return;
     }
     if (!description.trim()) {
       setNotification({
         show: true,
         type: 'error',
         message: 'Support form submission failed',
         subtitle: 'Please provide a description of the issue.'
       });
       return;
     }

     setIsSubmitting(true);

     try {
       // Upload attachments to Firebase Storage first
       const uploadedUrls: string[] = [];
       
       for (const file of attachments) {
         // Generate a unique filename with timestamp
         const timestamp = Date.now();
         const fileName = `${timestamp}-${file.name}`;
         const storageRef = ref(storage, `support-attachments/${fileName}`);
         
         // Upload file
         await uploadBytes(storageRef, file);
         
         // Get download URL
         const downloadUrl = await getDownloadURL(storageRef);
         uploadedUrls.push(downloadUrl);
       }

       // Send support request to Zapier webhook for Notion automation
      const zapierWebhookUrl = process.env.NEXT_PUBLIC_ZAPIER_WEBHOOK_URL;

      if (!zapierWebhookUrl) {
        console.error('⚠️ Zapier webhook URL not configured');
        setNotification({
         show: true,
         type: 'error',
         message: 'Support form submission failed',
         subtitle: 'Configuration error. Please contact support.'
       });
        return;
      }

      try {
        const webhookPayload = {
          // Basic info
          customerEmail: requestFromEmail,
          description: description,
          submittedAt: new Date().toISOString(),
          
          // Attachments
          attachmentUrls: uploadedUrls,
          attachmentCount: uploadedUrls.length,
          
          // Formatted attachment list for Notion description
          attachmentList: uploadedUrls.length > 0 
            ? uploadedUrls.map((url, index) => {
                const fileName = url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`;
                return `[${decodeURIComponent(fileName)}](${url})`;
              }).join('\n')
            : '',
          
          // Pre-formatted fields for easy Notion mapping
          notionTitle: `Support Request from ${requestFromEmail}`,
          notionDescription: description + (uploadedUrls.length > 0 
            ? '\n\n**Attachments:**\n' + uploadedUrls.map((url, index) => {
                const fileName = url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`;
                return `- [${decodeURIComponent(fileName)}](${url})`;
              }).join('\n')
            : ''),
          notionType: 'Support Ticket',
          notionStatus: 'New',
          notionPriority: 'Medium',
          notionAssignedTo: 'Unassigned',
          notionCreatedDate: new Date().toISOString().split('T')[0],
          notionReportedDate: new Date().toISOString().split('T')[0],
        };

        console.log('📤 Sending to Zapier:', webhookPayload);

        const response = await fetch('/api/zapier-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`Zapier webhook failed: ${response.status}`);
        }

        console.log('✅ Support request sent to Zapier successfully');
        setNotification({ 
         show: true, 
         type: 'success', 
         message: 'Support form submitted successfully' 
       });
        resetForm();

      } catch (webhookError: any) {
        console.error('❌ Zapier webhook error:', webhookError);
        setNotification({
         show: true,
         type: 'error',
         message: 'Support form submission failed',
         subtitle: "We couldn't submit your form—please try again, and if it keeps happening, check your connection."
       });
      }

     } catch (error: any) {
       console.error('Submission error:', error);
       setNotification({ show: true, type: 'error', message: 'Submission Error', subtitle: error.message || 'Failed to submit support request. Please try again.' });
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

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-[#232521] mb-6">Support Hub</h1>

        {/* Contact Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-[#232521]">Many ways to reach out</h2>
            <p className="text-sm text-gray-600 mt-1">Report an issue, request a change, or ask a quick question.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Call Us */}
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3"><PhoneIcon className="h-6 w-6 text-[#1b4a41]"/></div>
                    <p className="font-semibold">(555) 123-4567</p>
                    <p className="text-xs text-gray-500">Mon–Fri, 9 AM–5 PM EST</p>
                    <SecondaryButton href="tel:+15551234567" className="mt-2">
                      Call Number
                    </SecondaryButton>
                </div>
                {/* Text Us */}
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3"><DocumentTextIcon className="h-6 w-6 text-[#1b4a41]"/></div>
                    <p className="font-semibold">(555) 123-4567</p>
                    <p className="text-xs text-gray-500">Anytime</p>
                    <SecondaryButton onClick={handleCopyPhone} className="mt-2">
                      Copy Number
                    </SecondaryButton>
                </div>
                {/* Email Us */}
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3"><EnvelopeIcon className="h-6 w-6 text-[#1b4a41]"/></div>
                    <p className="font-semibold">support@tradesitegenie.com</p>
                    <p className="text-xs text-gray-500">Anytime</p>
                    <SecondaryButton onClick={handleCopyEmail} className="mt-2">
                      Copy Email
                    </SecondaryButton>
                </div>
            </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#232521]">Your Support Team is Standing By</h2>
          <p className="text-sm text-gray-600 mt-1">Please give us a description of the issue and attach screenshots or screen recordings if helpful.</p>
          
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="requestFromEmail" className="block text-sm font-medium text-gray-700 mb-1">Request From</label>
              <input type="email" id="requestFromEmail" value={requestFromEmail} onChange={e => setRequestFromEmail(e.target.value)} required className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b4a41] focus:border-transparent"/>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Please give us a description of the issue</label>
              <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={5} className="w-full min-h-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b4a41] focus:border-transparent"></textarea>
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
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </PrimaryButton>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
