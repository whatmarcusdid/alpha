'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCompanyData, updateCompanyData, CompanyData } from '@/lib/firestore/company';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DestructiveButton } from '@/components/ui/DestructiveButton';
import { GoogleIcon, AppleIcon } from '@/components/ui/icons';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { StickyBottomBar } from '@/components/ui/StickyBottomBar';
import { AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [timeZone, setTimeZone] = useState('Eastern Standard Time (EST)');
  const [emailFrequency, setEmailFrequency] = useState('real-time');
  const [originalTimeZone, setOriginalTimeZone] = useState('Eastern Standard Time (EST)');
  const [originalEmailFrequency, setOriginalEmailFrequency] = useState('real-time');
  const [wordpressDashboardUrl, setWordpressDashboardUrl] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<CompanyData>({
    legalName: '',
    websiteUrl: '',
    yearFounded: '',
    numEmployees: '',
    address: '',
    address2: '',
    city: '',
    state: 'Maryland',
    zipCode: '',
    businessService: 'Plumbing',
    serviceArea: ''
  });
  const [originalData, setOriginalData] = useState(formData);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    show: boolean;
  }>({ type: 'success', message: '', show: false });

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/signin');
        return;
      }
      setCurrentUser(user);

      const companyData = await getCompanyData(user.uid);
      if (companyData) {
        setFormData(companyData);
        setOriginalData(companyData);
      }

      try {
        const token = await user.getIdToken();
        const settingsRes = await fetch('/api/user/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.timezoneLabel) {
            setTimeZone(data.timezoneLabel);
            setOriginalTimeZone(data.timezoneLabel);
          }
          if (data.emailFrequency) {
            setEmailFrequency(data.emailFrequency);
            setOriginalEmailFrequency(data.emailFrequency);
          }
          if (data.wordpressDashboardUrl !== undefined) {
            setWordpressDashboardUrl(data.wordpressDashboardUrl || null);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }

      setLoading(false);
    };
    checkAuth();
  }, [router]);

  // Focus modal when opened, handle Escape key
  useEffect(() => {
    if (showDeleteModal) {
      deleteModalRef.current?.focus();
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isRequestingDeletion) {
          setShowDeleteModal(false);
          setDeletionReason('');
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showDeleteModal, isRequestingDeletion]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;

    const success = await updateCompanyData(currentUser.uid, formData);
    if (success) {
      setOriginalData(formData);
      setIsEditMode(false);
    } else {
      // Handle error
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditMode(false);
  };

  const hasSettingsChanges =
    timeZone !== originalTimeZone || emailFrequency !== originalEmailFrequency;

  const handleSaveSettings = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezoneLabel: timeZone,
          emailFrequency: emailFrequency,
        }),
      });

      if (res.ok) {
        setOriginalTimeZone(timeZone);
        setOriginalEmailFrequency(emailFrequency);
        setNotification({
          type: 'success',
          message: 'Settings saved successfully',
          show: true,
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to save settings. Please try again.',
          show: true,
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Failed to save settings. Please try again.',
        show: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSettings = () => {
    setTimeZone(originalTimeZone);
    setEmailFrequency(originalEmailFrequency);
  };

  const handleDownloadData = async () => {
    if (!currentUser) return;

    setIsExporting(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/user/export-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tradesitegenie-data-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setNotification({
          type: 'success',
          message: 'Your data export has been downloaded',
          show: true,
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to export data. Please try again.',
          show: true,
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Failed to export data. Please try again.',
        show: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!currentUser) return;

    setIsRequestingDeletion(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/user/request-deletion', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deletionReason.trim() ? { reason: deletionReason.trim() } : {}),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setShowDeleteModal(false);
        setDeletionReason('');
        setNotification({
          type: 'success',
          message: data.message || "Your account deletion request has been submitted. We'll process it within 48 hours and send you a confirmation email.",
          show: true,
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to submit deletion request. Please try again or contact support.',
          show: true,
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Failed to submit deletion request. Please try again or contact support.',
        show: true,
      });
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  const handleGoToWordPressDashboard = () => {
    if (wordpressDashboardUrl) {
      window.open(wordpressDashboardUrl, '_blank', 'noopener,noreferrer');
    } else {
      setNotification({
        type: 'error',
        message: 'WordPress dashboard URL not configured. Please contact support.',
        show: true,
      });
    }
  };

  return (
    <main
      className={`max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 ${hasSettingsChanges ? 'pb-24 lg:pb-24' : ''}`}
    >
      <h1 className="text-3xl font-bold text-[#232521] mb-8">Settings</h1>
      
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-2xl font-bold text-[#232521] mb-4">Time Zone</h2>
        <div className="max-w-[600px] mx-auto">
          <p className="text-sm text-gray-600 mb-4">Choose the time zone your business operates in so we can schedule reports, notifications, and bookings accurately.</p>
          
          <label htmlFor="time-zone" className="block text-sm font-medium text-[#232521] mb-2">Select time zone</label>
          <select 
            id="time-zone"
            name="time-zone"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="w-full min-h-[40px] px-4 py-2 bg-white border border-[#6F797A] rounded-lg"
          >
            <option>Eastern Standard Time (EST)</option>
            <option>Central Standard Time (CST)</option>
            <option>Mountain Standard Time (MST)</option>
            <option>Pacific Standard Time (PST)</option>
            <option>Alaska Standard Time (AKST)</option>
            <option>Hawaii-Aleutian Standard Time (HAST)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-2xl font-bold text-[#232521] mb-4">Linked Accounts</h2>
        <div className="max-w-[600px] mx-auto">
          <p className="text-sm text-gray-600 mb-4">Connect social accounts for easier login and account recovery. You can link multiple services and choose your preferred sign-in method.</p>

          <div className="space-y-3">
            <button className="w-full h-11 bg-white border border-[#747775] text-[#1F1F1F] text-sm font-medium rounded-[360px] flex items-center justify-center px-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
              <GoogleIcon className="mr-3 h-5 w-5" />
              <span>Connect with Google</span>
            </button>
            <button className="w-full h-11 bg-black text-white text-sm font-medium rounded-[360px] flex items-center justify-center px-4 hover:bg-gray-800 active:bg-gray-900 transition-colors">
              <AppleIcon className="mr-3 h-5 w-5" />
              <span>Connect with Apple</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-2xl font-bold text-[#232521] mb-4">Email Notification Frequency</h2>
        <div className="max-w-[600px] mx-auto">
          <p className="text-sm text-gray-600 mb-4">Choose how often you receive email updates. Critical alerts (like failed payments or new leads) will always be sent in real time.</p>

          <RadioGroup value={emailFrequency} onValueChange={setEmailFrequency} className="space-y-4">
            <div className="flex items-start gap-3">
              <RadioGroupItem value="real-time" id="real-time" />
              <div>
                <label htmlFor="real-time" className="font-medium text-[#232521] cursor-pointer">Real-Time Notifications</label>
                <p className="text-sm text-gray-600">Receive alerts as events happen</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <RadioGroupItem value="daily" id="daily" />
              <div>
                <label htmlFor="daily" className="font-medium text-[#232521] cursor-pointer">Daily Digest</label>
                <p className="text-sm text-gray-600">One email summary per day with grouped notifications</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <RadioGroupItem value="weekly" id="weekly" />
              <div>
                <label htmlFor="weekly" className="font-medium text-[#232521] cursor-pointer">Weekly Summary</label>
                <p className="text-sm text-gray-600">One weekly email with an overview of your account activity</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <RadioGroupItem value="critical" id="critical" />
              <div>
                <label htmlFor="critical" className="font-medium text-[#232521] cursor-pointer">Only Critical Alerts</label>
                <p className="text-sm text-gray-600">Only urgent issues like billing failures or incoming leads</p>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>

      {hasSettingsChanges && (
        <StickyBottomBar>
          <SecondaryButton onClick={handleCancelSettings}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </PrimaryButton>
        </StickyBottomBar>
      )}

      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-2xl font-bold text-[#232521] mb-4">Privacy</h2>
        <div className="max-w-[600px] mx-auto">
          <div>
            <h3 className="text-lg font-semibold text-[#232521] mb-2">Download Your Data</h3>
            <p className="text-sm text-gray-600 mb-3">Get a copy of all your business information, analytics reports, and account data.</p>
            <button
              type="button"
              onClick={handleDownloadData}
              disabled={isExporting}
              className="bg-transparent border-none p-0 text-left text-[#1B4A41] font-medium hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              {isExporting ? 'Downloading...' : 'Download My Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-2xl font-bold text-[#232521] mb-4">WordPress Dashboard Access</h2>
        <div className="max-w-[600px] mx-auto">
          <p className="text-sm text-gray-600 mb-4">We maintain secure admin access to your WordPress site to deliver maintenance services.</p>

          <div className="mb-3">
              <span className="text-sm text-gray-600">Username: </span>
              <span className="text-sm font-medium text-[#232521]">tsg-maintenance@tradesitegenie.com</span>
          </div>

          <p className="text-sm text-gray-600 mb-3">You can view or revoke our access anytime. Revoking access will pause your maintenance services until access is restored.</p>

          <span
            onClick={handleGoToWordPressDashboard}
            className={`font-medium ${
              wordpressDashboardUrl
                ? 'text-[#1B4A41] hover:underline cursor-pointer'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            Go To WordPress Dashboard
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-2xl font-bold text-[#232521] mb-4">Legal Documents</h2>
        <div className="max-w-[600px] mx-auto">
          <p className="text-sm text-gray-600 mb-4">Review the agreements and policies that govern your TradeSiteGenie account and services. These documents outline your rights, our commitments, and how we work together.</p>

          <div className="space-y-4">
            <div>
              <span className="text-[#1B4A41] font-medium hover:underline cursor-pointer">Terms of Service</span>
              <p className="text-sm text-gray-600 mt-1">Your rights and responsibilities when using TradeSiteGenie services, including subscription details, service scope, and cancellation terms.</p>
            </div>
            <div>
              <span className="text-[#1B4A41] font-medium hover:underline cursor-pointer">Privacy Policy</span>
              <p className="text-sm text-gray-600 mt-1">How we collect, use, store, and protect your business information and personal data.</p>
            </div>
            <div>
              <span className="text-[#1B4A41] font-medium hover:underline cursor-pointer">Refund Policy</span>
              <p className="text-sm text-gray-600 mt-1">Our refund conditions, performance guarantees, and the process for requesting refunds.</p>
            </div>
            <div>
              <span className="text-[#1B4A41] font-medium hover:underline cursor-pointer">Support Expectations</span>
              <p className="text-sm text-gray-600 mt-1">What to expect from our support team, including response times, maintenance schedules, and how to use your support hours.</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-2">Last updated: July 1, 2025</p>
            <p className="text-sm text-gray-600">Questions about these policies? Contact us at <a href="mailto:support@tradesitegenie.com" className="text-[#1B4A41] hover:underline">support@tradesitegenie.com</a></p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[#232521] mb-4">Delete Account</h2>
        <div className="max-w-[600px] mx-auto">
          <p className="text-sm text-gray-600 mb-3">Permanently delete your TradeSiteGenie account and all associated website data.</p>
          <p className="text-sm font-semibold text-[#232521] mb-4">This action is permanent and cannot be undone.</p>
          <DestructiveButton onClick={() => setShowDeleteModal(true)} className="w-full">
            Request Account Deletion
          </DestructiveButton>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            if (!isRequestingDeletion) {
              setShowDeleteModal(false);
              setDeletionReason('');
            }
          }}
          role="presentation"
        >
          <div
            ref={deleteModalRef}
            tabIndex={-1}
            className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-[#E7000B] flex-shrink-0" />
              <h2 id="delete-modal-title" className="text-xl font-bold text-[#232521]">
                Delete Your Account
              </h2>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                This will permanently delete your TradeSiteGenie account and all associated data.
              </p>
              <p className="text-sm text-gray-600">
                This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600">
                Your subscription will be cancelled.
              </p>
              <p className="text-sm text-gray-600">
                All website data, reports, and support history will be removed.
              </p>
            </div>

            <div className="mb-6">
              <label
                htmlFor="deletion-reason"
                className="block text-sm font-medium text-[#232521] mb-2"
              >
                Reason for leaving (optional)
              </label>
              <textarea
                id="deletion-reason"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Help us improve by sharing why you're leaving..."
                className="w-full min-h-[80px] px-4 py-2 bg-white border border-[#6F797A] rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#1B4A41]"
                disabled={isRequestingDeletion}
              />
            </div>

            <div className="flex justify-end gap-4">
              <SecondaryButton
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletionReason('');
                }}
                disabled={isRequestingDeletion}
              >
                Cancel
              </SecondaryButton>
              <DestructiveButton
                onClick={handleRequestDeletion}
                disabled={isRequestingDeletion}
              >
                {isRequestingDeletion ? 'Submitting...' : 'Delete My Account'}
              </DestructiveButton>
            </div>
          </div>
        </div>
      )}

      <NotificationToast
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onDismiss={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
    </main>
  );
}
