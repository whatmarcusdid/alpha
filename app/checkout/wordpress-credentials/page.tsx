'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export default function WordPressCredentialsPage() {
  const router = useRouter();
  
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Send credentials to backend/Firestore
    console.log('WordPress credentials submitted:', { dashboardUrl, adminEmail, adminPassword });
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard'); 
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <Header />

      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#232521] mb-2">
            Enter Your WordPress Login Details
          </h1>
          <p className="text-gray-600 mb-8">
            This helps us connect to your WordPress dashboard so we can complete your setup quickly and correctly. Your credentials are used only to access your site for configuration and support.
          </p>

          <form onSubmit={handleSubmit}>
            {/* WordPress Dashboard URL */}
            <div className="mb-6">
              <label htmlFor="dashboardUrl" className="block text-sm font-semibold text-[#232521] mb-2">
                WordPress Dashboard URL
              </label>
              <input
                type="url"
                id="dashboardUrl"
                value={dashboardUrl}
                onChange={(e) => setDashboardUrl(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
                placeholder="https://yoursite.com/wp-admin"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Usually ends with /wp-admin</p>
            </div>

            {/* WordPress Admin Email */}
            <div className="mb-6">
              <label htmlFor="adminEmail" className="block text-sm font-semibold text-[#232521] mb-2">
                WordPress Admin Email
              </label>
              <input
                type="email"
                id="adminEmail"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
                placeholder="admin@yoursite.com"
                required
              />
            </div>

            {/* WordPress Admin Password */}
            <div className="mb-6">
              <label htmlFor="adminPassword" className="block text-sm font-semibold text-[#232521] mb-2">
                WordPress Admin Password
              </label>
              <input
                type="password"
                id="adminPassword"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Security Notice */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-[#232521] mb-1">Your credentials are secure</p>
                <p className="text-sm text-gray-600">
                  We encrypt and store your login details securely. They're only used to manage your site and provide support.
                </p>
              </div>
            </div>

            <PrimaryButton
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Submitting...' : 'Continue'}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}
