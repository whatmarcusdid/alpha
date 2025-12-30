'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type WordPressCredentials = {
  dashboardUrl: string;
  adminEmail: string;
  adminPassword: string;
};

export default function WordPressCredentialsPage() {
  const router = useRouter();
  
  const [credentials, setCredentials] = useState<WordPressCredentials>({
    dashboardUrl: '',
    adminEmail: '',
    adminPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!credentials.dashboardUrl.trim()) {
      newErrors.dashboardUrl = 'WordPress Dashboard URL is required';
    } else if (!credentials.dashboardUrl.includes('/wp-admin')) {
      newErrors.dashboardUrl = 'URL should end with /wp-admin';
    }
    
    if (!credentials.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.adminEmail)) {
      newErrors.adminEmail = 'Invalid email format';
    }
    
    if (!credentials.adminPassword.trim()) {
      newErrors.adminPassword = 'Admin password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // TODO: Send credentials to backend/Firestore
    // For now, simulate API call
    setTimeout(() => {
      console.log('WordPress credentials submitted:', credentials);
      setIsSubmitting(false);
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🧞</span>
            <span className="text-xl font-bold text-[#232521]">TRADESITEGENIE</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#232521] mb-2">
            Enter Your WordPress Login Details
          </h1>
          <p className="text-gray-600 mb-8">
            This helps us connect to your WordPress dashboard so we can complete your setup quickly and correctly. Your credentials are used only to access your site for configuration and support.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* WordPress Dashboard URL */}
            <div>
              <label htmlFor="dashboardUrl" className="block text-sm font-medium text-[#232521] mb-1">
                WordPress Dashboard URL
              </label>
              <input
                type="url"
                id="dashboardUrl"
                value={credentials.dashboardUrl}
                onChange={(e) => setCredentials({ ...credentials, dashboardUrl: e.target.value })}
                className={`w-full min-h-[40px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent ${
                  errors.dashboardUrl ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="https://yoursite.com/wp-admin"
              />
              {errors.dashboardUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.dashboardUrl}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Usually ends with /wp-admin
              </p>
            </div>

            {/* WordPress Admin Email */}
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-[#232521] mb-1">
                WordPress Admin Email
              </label>
              <input
                type="email"
                id="adminEmail"
                value={credentials.adminEmail}
                onChange={(e) => setCredentials({ ...credentials, adminEmail: e.target.value })}
                className={`w-full min-h-[40px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent ${
                  errors.adminEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="admin@yoursite.com"
              />
              {errors.adminEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.adminEmail}</p>
              )}
            </div>

            {/* WordPress Admin Password */}
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-[#232521] mb-1">
                WordPress Admin Password
              </label>
              <input
                type="password"
                id="adminPassword"
                value={credentials.adminPassword}
                onChange={(e) => setCredentials({ ...credentials, adminPassword: e.target.value })}
                className={`w-full min-h-[40px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#9be382] focus:border-transparent ${
                  errors.adminPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
              />
              {errors.adminPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.adminPassword}</p>
              )}
            </div>

            {/* Security Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-gray-700">
                  <p className="font-semibold text-[#232521] mb-1">Your credentials are secure</p>
                  <p>We encrypt and store your login details securely. They're only used to manage your site and provide support.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[40px] px-6 py-4 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold text-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
