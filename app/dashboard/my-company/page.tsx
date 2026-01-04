'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCompanyData, updateCompanyData, CompanyData } from '@/lib/firestore/company';
import { Edit2 } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { PageCard } from '@/components/layout/PageCard';
import { DashboardNav } from '@/components/layout/DashboardNav';

export default function MyCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
    subtitle?: string;
  }>({ show: false, type: 'success', message: '', subtitle: '' });
  
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
      
      // Fetch company data from Firestore
      const companyData = await getCompanyData(user.uid);
      
      if (companyData) {
        // User has existing company data
        setFormData(companyData);
        setOriginalData(companyData);
      } else {
        // New user - set empty defaults
        const emptyData = {
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
        };
        setFormData(emptyData);
        setOriginalData(emptyData);
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
    if (!currentUser) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Not logged in',
        subtitle: 'Please log in to save changes.'
      });
      setTimeout(() => setNotification({ ...notification, show: false }), 5000);
      return;
    }

    const success = await updateCompanyData(currentUser.uid, formData);
    
    if (success) {
      setOriginalData(formData);
      setIsEditMode(false);
      setNotification({
        show: true,
        type: 'success',
        message: 'Changes saved',
        subtitle: 'Your company information has been updated and is now live in your dashboard.'
      });
      setTimeout(() => setNotification({ ...notification, show: false }), 5000);
    } else {
      setNotification({
        show: true,
        type: 'error',
        message: 'Changes not saved',
        subtitle: 'We couldn\'t save your updates—please try again, and if it keeps happening, check your connection.'
      });
      setTimeout(() => setNotification({ ...notification, show: false }), 5000);
    }
  }

  const handleCancel = () => {
    setFormData(originalData); // Revert to saved data
    setIsEditMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F1]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b4a41] mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F1] p-4">
      <DashboardNav />
      <NotificationToast
        show={notification.show}
        type={notification.type}
        message={notification.message}
        subtitle={notification.subtitle}
        onDismiss={() => setNotification({ ...notification, show: false })}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <PageCard>
          
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[#232521]">My Company</h1>
            
            {!isEditMode && (
              <SecondaryButton
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </SecondaryButton>
            )}
          </div>

          {/* General Information Section */}
          <div className="max-w-[600px] mx-auto mb-6">
            <h2 className="text-2xl font-bold text-[#232521] mb-6">General Information</h2>
            
            <div className="space-y-4">
              {/* Legal Entity Name */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Legal Entity Name or DBA Name
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    name="legalName"
                    value={formData.legalName}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                  />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.legalName}
                  </div>
                )}
              </div>

              {/* Business Website URL */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Business Website URL
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                  />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.websiteUrl}
                  </div>
                )}
              </div>

              {/* Year Founded */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Year founded
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    name="yearFounded"
                    value={formData.yearFounded}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                  />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.yearFounded}
                  </div>
                )}
              </div>

              {/* Number of Employees */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Number of employees
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    name="numEmployees"
                    value={formData.numEmployees}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                  />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.numEmployees}
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Address
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                  />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.address}
                  </div>
                )}
              </div>

              {/* Address 2 (Optional) */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Address 2 (Optional)
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                  />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.address2 || '-'}
                  </div>
                )}
              </div>

              {/* City, State, Zip Code - 3 Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-[#232521] mb-2">
                    City
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                    />
                  ) : (
                    <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                      {formData.city}
                    </div>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-[#232521] mb-2">
                    State
                  </label>
                  {isEditMode ? (
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                    >
                      <option>Maryland</option>
                      <option>Virginia</option>
                      <option>DC</option>
                      <option>Delaware</option>
                      <option>Pennsylvania</option>
                      <option>West Virginia</option>
                    </select>
                  ) : (
                    <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                      {formData.state}
                    </div>
                  )}
                </div>

                {/* Zip Code */}
                <div>
                  <label className="block text-sm font-medium text-[#232521] mb-2">
                    Zip Code
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                    />
                  ) : (
                    <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                      {formData.zipCode}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Business Services Section */}
          <div className="max-w-[600px] mx-auto">
            <h2 className="text-2xl font-bold text-[#232521] mb-6">Business Services</h2>
            
            <div className="space-y-4">
              {/* Select Business Service */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Select your business services
                </label>
                {isEditMode ? (
                  <select
                    name="businessService"
                    value={formData.businessService}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
                  >
                    <option>Plumbing</option>
                    <option>HVAC</option>
                    <option>Electrical</option>
                    <option>Roofing</option>
                    <option>Painting</option>
                    <option>General Contractor</option>
                    <option>Landscaping</option>
                  </select>
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.businessService}
                  </div>
                )}
              </div>

              {/* Service Area */}
              <div>
                <label className="block text-sm font-medium text-[#232521] mb-2">
                  Enter your service area
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    name="serviceArea"
                    value={formData.serviceArea}
                    onChange={handleInputChange}
                    className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4A41]"
                  />
                ) : (
                  <div className="w-full min-h-[40px] px-4 flex items-center bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    {formData.serviceArea}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit Mode Action Buttons */}
          {isEditMode && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-4">
              <SecondaryButton onClick={handleCancel}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleSave}>
                Save Changes
              </PrimaryButton>
            </div>
          )}
        </PageCard>
      </main>
    </div>
  );
}
