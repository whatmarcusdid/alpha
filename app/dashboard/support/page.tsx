'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { submitSupportRequest, AttachmentFile } from '@/lib/firestore/support';
import { uploadSupportAttachment, validateFile } from '@/lib/firebase/storage';
import { DashboardNav } from '@/components/layout/DashboardNav';
import {
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  PaperClipIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function SupportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requestFromEmail, setRequestFromEmail] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    show: boolean;
    message: string;
  }>({ type: 'success', show: false, message: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      if (user?.email) {
        setRequestFromEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message, show: true });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification('success', `${label} copied!`);
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
            showNotification('error', validation.error || 'Invalid file.');
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
        showNotification('error', 'You must be logged in to submit a request.');
        return;
    }
    if (!description.trim()) {
        showNotification('error', 'Please provide a description.');
        return;
    }

    setIsSubmitting(true);

    try {
        // Create a temporary request to get an ID
        const tempRequest = await submitSupportRequest(user.uid, requestFromEmail, description, []);
        if (!tempRequest.success || !tempRequest.requestId) {
            throw new Error(tempRequest.error || 'Failed to create support request.');
        }

        const uploadedAttachments: AttachmentFile[] = [];
        for (const file of attachments) {
            const upload = await uploadSupportAttachment(file, tempRequest.requestId);
            if (upload.success && upload.attachment) {
                uploadedAttachments.push(upload.attachment);
            } else {
                throw new Error(upload.error || `Failed to upload ${file.name}`);
            }
        }
        
        // Finalize request with attachment data
        const finalResult = await submitSupportRequest(user.uid, requestFromEmail, description, uploadedAttachments);
        if (!finalResult.success) {
            throw new Error(finalResult.error || 'Failed to finalize support request.');
        }

        showNotification('success', 'Support request submitted successfully!');
        resetForm();

    } catch (error: any) {
        showNotification('error', error.message || 'An unknown error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#F7F6F1] p-4">
        <DashboardNav />
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
                      <a href="tel:+15551234567" className="mt-4 px-4 py-2 text-sm font-semibold text-[#1b4a41] bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">Call</a>
                  </div>
                  {/* Text Us */}
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3"><DocumentTextIcon className="h-6 w-6 text-[#1b4a41]"/></div>
                      <p className="font-semibold">(555) 123-4567</p>
                      <p className="text-xs text-gray-500">Anytime</p>
                      <button onClick={() => copyToClipboard('(555) 123-4567', 'Number')} className="mt-4 px-4 py-2 text-sm font-semibold text-[#1b4a41] bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">Copy Number</button>
                  </div>
                  {/* Email Us */}
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3"><EnvelopeIcon className="h-6 w-6 text-[#1b4a41]"/></div>
                      <p className="font-semibold">support@tradesitegenie.com</p>
                      <p className="text-xs text-gray-500">Anytime</p>
                      <button onClick={() => copyToClipboard('support@tradesitegenie.com', 'Email')} className="mt-4 px-4 py-2 text-sm font-semibold text-[#1b4a41] bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">Copy Email</button>
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
                  <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? 'Sending...' : 'Send Request'}
                  </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-5 right-5 w-full max-w-sm rounded-lg shadow-lg p-4 text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">{notification.message}</p>
            <button onClick={() => setNotification({ ...notification, show: false })} className="p-1 rounded-full hover:bg-white/20">
              <XMarkIcon className="h-5 w-5"/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
