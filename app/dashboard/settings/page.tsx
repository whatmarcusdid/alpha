'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCompanyData, updateCompanyData, CompanyData } from '@/lib/firestore/company';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DestructiveButton } from '@/components/ui/DestructiveButton';
import { GoogleIcon, AppleIcon } from '@/components/ui/icons';
import { Edit2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [timeZone, setTimeZone] = useState('Eastern Standard Time (EST)');
  const [emailFrequency, setEmailFrequency] = useState('real-time');
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
      
      setLoading(false);
    };
    checkAuth();
  }, [router]);

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

  return (
    <div className="min-h-screen bg-[#F7F6F1] p-4">
      <DashboardNav />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-[#232521] mb-8">Settings</h1>
        
        {/* Company Info Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-[#232521]">Company Information</h2>
            {!isEditMode && (
              <SecondaryButton onClick={() => setIsEditMode(true)} className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </SecondaryButton>
            )}
          </div>
          <div className="max-w-[600px] mx-auto">
            <div className="space-y-4">
              {/* Legal Entity Name */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Legal Entity Name or DBA Name</label>
                {isEditMode ? (
                  <input type="text" name="legalName" value={formData.legalName} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.legalName}</div>
                )}
              </div>

              {/* Business Website URL */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Business Website URL</label>
                {isEditMode ? (
                  <input type="text" name="websiteUrl" value={formData.websiteUrl} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.websiteUrl}</div>
                )}
              </div>

              {/* Year Founded */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Year founded</label>
                {isEditMode ? (
                  <input type="text" name="yearFounded" value={formData.yearFounded} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.yearFounded}</div>
                )}
              </div>

              {/* Number of Employees */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Number of employees</label>
                {isEditMode ? (
                  <input type="text" name="numEmployees" value={formData.numEmployees} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.numEmployees}</div>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Address</label>
                {isEditMode ? (
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.address}</div>
                )}
              </div>

              {/* Address 2 (Optional) */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Address 2 (Optional)</label>
                {isEditMode ? (
                  <input type="text" name="address2" value={formData.address2} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.address2 || '-'}</div>
                )}
              </div>

              {/* City, State, Zip Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#232521] mb-2">City</label>
                  {isEditMode ? (
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                  ) : (
                    <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.city}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#232521] mb-2">State</label>
                  {isEditMode ? (
                    <select name="state" value={formData.state} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg">
                      <option>Maryland</option>
                      <option>Virginia</option>
                      <option>DC</option>
                      <option>Delaware</option>
                      <option>Pennsylvania</option>
                      <option>West Virginia</option>
                    </select>
                  ) : (
                    <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.state}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#232521] mb-2">Zip Code</label>
                  {isEditMode ? (
                    <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                  ) : (
                    <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.zipCode}</div>
                  )}
                </div>
              </div>

              {/* Business Service */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Select your business services</label>
                {isEditMode ? (
                  <select name="businessService" value={formData.businessService} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg">
                    <option>Plumbing</option>
                    <option>HVAC</option>
                    <option>Electrical</option>
                    <option>Roofing</option>
                    <option>Painting</option>
                    <option>General Contractor</option>
                    <option>Landscaping</option>
                  </select>
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.businessService}</div>
                )}
              </div>

              {/* Service Area */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">Enter your service area</label>
                {isEditMode ? (
                  <input type="text" name="serviceArea" value={formData.serviceArea} onChange={handleInputChange} className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg" />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">{formData.serviceArea}</div>
                )}
              </div>

              {isEditMode && (
                <div className="flex justify-end gap-4">
                  <SecondaryButton onClick={handleCancel}>Cancel</SecondaryButton>
                  <PrimaryButton onClick={handleSave}>Save Changes</PrimaryButton>
                </div>
              )}
            </div>
          </div>
        </div>

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
              className="w-full min-h-[40px] px-4 py-2 border border-[#6F797A] rounded-lg"
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

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input id="real-time" name="emailFrequency" type="radio" value="real-time" checked={emailFrequency === 'real-time'} onChange={(e) => setEmailFrequency(e.target.value)} className="w-4 h-4 text-[#1B4A41] border-gray-300" />
                <div>
                  <label htmlFor="real-time" className="font-medium text-[#232521]">Real-Time Notifications</label>
                  <p className="text-sm text-gray-600">Receive alerts as events happen</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input id="daily" name="emailFrequency" type="radio" value="daily" checked={emailFrequency === 'daily'} onChange={(e) => setEmailFrequency(e.target.value)} className="w-4 h-4 text-[#1B4A41] border-gray-300" />
                <div>
                  <label htmlFor="daily" className="font-medium text-[#232521]">Daily Digest</label>
                  <p className="text-sm text-gray-600">One email summary per day with grouped notifications</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input id="weekly" name="emailFrequency" type="radio" value="weekly" checked={emailFrequency === 'weekly'} onChange={(e) => setEmailFrequency(e.target.value)} className="w-4 h-4 text-[#1B4A41] border-gray-300" />
                <div>
                  <label htmlFor="weekly" className="font-medium text-[#232521]">Weekly Summary</label>
                  <p className="text-sm text-gray-600">One weekly email with an overview of your account activity</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input id="critical" name="emailFrequency" type="radio" value="critical" checked={emailFrequency === 'critical'} onChange={(e) => setEmailFrequency(e.target.value)} className="w-4 h-4 text-[#1B4A41] border-gray-300" />
                <div>
                  <label htmlFor="critical" className="font-medium text-[#232521]">Only Critical Alerts</label>
                  <p className="text-sm text-gray-600">Only urgent issues like billing failures or incoming leads</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-2xl font-bold text-[#232521] mb-4">Privacy</h2>
          <div className="max-w-[600px] mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-[#232521] mb-2">Download Your Data</h3>
              <p className="text-sm text-gray-600 mb-3">Get a copy of all your business information, analytics reports, and account data.</p>
              <span onClick={() => console.log('Download data clicked')} className="text-[#1B4A41] font-medium hover:underline cursor-pointer">Download My Data</span>
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

            <span onClick={() => console.log('Go to WP dashboard clicked')} className="text-[#1B4A41] font-medium hover:underline cursor-pointer">Go To WordPress Dashboard</span>
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
            <DestructiveButton onClick={() => console.log('Request account deletion clicked')} className="w-full">
              Request Account Deletion
            </DestructiveButton>
          </div>
        </div>
      </main>
    </div>
  );
}
