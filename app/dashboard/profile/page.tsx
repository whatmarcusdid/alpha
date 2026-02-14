'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange, signOut, updateUserEmail } from '@/lib/auth';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/firestore/profile';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { PageCard } from '@/components/layout/PageCard';
import ChangePasswordModal from '@/components/profile/ChangePasswordModal';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [originalData, setOriginalData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; show: boolean; message: string; subtitle?: string }>({ type: 'success', show: false, message: '' });
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getUserProfile(user.uid)
        .then(profile => {
          if (profile) {
            setFormData(profile);
            setOriginalData(profile);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const showNotification = (type: 'success' | 'error', message: string, subtitle?: string) => {
    setNotification({ type, message, subtitle, show: true });
  };

  const handleSave = async () => {
    if (!formData || !user) return;

    // Validate
    if (!formData.fullName.trim()) {
      showNotification('error', 'Full name is required');
      return;
    }

    // Check if email changed
    const emailChanged = formData.email !== originalData?.email;

    try {
      // Update email in Firebase Auth if it changed
      if (emailChanged) {
        // Check if user has password authentication (not just social auth)
        const hasPasswordProvider = user.providerData.some(
          provider => provider.providerId === 'password'
        );

        let password: string | null = null;
        
        // Only ask for password if user has password authentication
        if (hasPasswordProvider) {
          password = prompt('To change your email, please enter your current password:');
          if (!password) {
            showNotification('error', 'Password required to change email');
            return;
          }
        }
        
        const emailResult = await updateUserEmail(formData.email, password || undefined);
        if (!emailResult.success) {
          showNotification('error', emailResult.error || 'Failed to update email');
          return;
        }
        
        // If verification is required, show special message
        if (emailResult.requiresVerification) {
          showNotification(
            'success', 
            'Verification email sent',
            `Please check ${formData.email} and click the verification link to complete your email change. Your current email remains active until verified.`
          );
          // Reset form to original data since email hasn't actually changed yet
          setFormData(originalData);
          setIsEditMode(false);
          return;
        }
      }

      // Update profile in Firestore
      const result = await updateUserProfile(user.uid, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      });

      if (result.success) {
        setOriginalData(formData); // Important: Update original data
        setIsEditMode(false);
        showNotification('success', 'Profile updated successfully');
      } else {
        showNotification('error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification('error', 'An error occurred while saving');
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditMode(false);
  };
  
  const handleLogout = async () => {
      await signOut();
  };

  if (loading) {
    return (
      <main className="max-w-[1440px] mx-auto px-0 py-8">
        <p>Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="max-w-[1440px] mx-auto px-0 py-8">
      <NotificationToast
        show={notification.show}
        type={notification.type}
        message={notification.message}
        subtitle={notification.subtitle}
        onDismiss={() => setNotification({ ...notification, show: false })}
      />
      <PageCard>
        
        {/* FULL-WIDTH HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#232521]">My Profile</h1>
          <div className="flex gap-3">
            {!isEditMode ? (
              <>
                <SecondaryButton onClick={() => setIsEditMode(true)}>
                  Edit
                </SecondaryButton>
                <SecondaryButton onClick={handleLogout}>
                  Log Out
                </SecondaryButton>
              </>
            ) : (
              <>
                <PrimaryButton onClick={handleSave}>
                  Save
                </PrimaryButton>
                <SecondaryButton onClick={handleCancel}>
                  Cancel
                </SecondaryButton>
              </>
            )}
          </div>
        </div>

        {/* CENTER-ALIGNED CONTENT (600px max-width) */}
        <div className="max-w-[600px] mx-auto">
          
          {/* Account Information Section */}
          <div>
            <h2 className="text-lg font-semibold text-[#232521] mb-4">
              Account Information
            </h2>
            <div className="space-y-6">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                      type="text"
                      value={formData?.fullName || ''}
                      onChange={(e) => setFormData({ ...formData!, fullName: e.target.value })}
                      disabled={!isEditMode}
                      className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                </label>
                <input
                    type="email"
                    value={formData?.email || ''}
                    onChange={(e) => setFormData({ ...formData!, email: e.target.value })}
                    disabled={!isEditMode}
                    className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                />
                {!isEditMode && (
                    <p className="text-sm text-gray-500 mt-1">Click Edit to update your email.</p>
                )}
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                      type="tel"
                      value={formData?.phone || ''}
                      onChange={(e) => setFormData({ ...formData!, phone: e.target.value })}
                      disabled={!isEditMode}
                      placeholder="(240) 521-4763"
                      className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <input
                      type="text"
                      value={formData?.role || ''}
                      onChange={(e) => setFormData({ ...formData!, role: e.target.value })}
                      disabled={!isEditMode}
                      placeholder="e.g., Owner, Manager"
                      className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                  />
              </div>
            </div>
          </div>

          {/* Password & Security Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#232521]">Security</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your account security settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Only show password change for users with password authentication */}
              {user?.providerData.some(provider => provider.providerId === 'password') ? (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-[#232521]">Password</p>
                    <p className="text-sm text-gray-500">
                      Update your password to keep your account secure
                    </p>
                  </div>
                  <button
                    onClick={() => setShowChangePasswordModal(true)}
                    className="rounded-full border-2 border-[#1B4A41] bg-white px-6 py-2 text-[#1B4A41] font-bold hover:bg-gray-50 transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-[#232521]">Sign-in Method</p>
                    <p className="text-sm text-gray-500">
                      You signed in with {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 
                                         user?.providerData[0]?.providerId === 'apple.com' ? 'Apple' : 
                                         'a social provider'}. Your password is managed by your provider, not TradeSiteGenie.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
        
      </PageCard>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {
          showNotification('success', 'Password updated successfully', 'You can now use your new password to sign in.');
        }}
      />
    </main>
  );
}
