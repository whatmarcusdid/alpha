'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange, signOut, updateUserEmail } from '@/lib/auth';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/firestore/profile';
import { changePassword } from '@/lib/auth/password';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { PageCard } from '@/components/layout/PageCard';
import { DashboardNav } from '@/components/layout/DashboardNav';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [originalData, setOriginalData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; show: boolean; message: string; subtitle?: string }>({ type: 'success', show: false, message: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

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
        const emailResult = await updateUserEmail(formData.email);
        if (!emailResult.success) {
          showNotification('error', emailResult.error || 'Failed to update email');
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
  
  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
        showNotification('error', 'New passwords do not match.');
        return;
    }

    const result = await changePassword(passwordData.current, passwordData.new);

    if (result.success) {
        showNotification('success', 'Password changed successfully!');
        setPasswordData({ current: '', new: '', confirm: '' });
    } else {
        showNotification('error', result.error || 'Failed to change password.');
    }
  };
  
  const handleLogout = async () => {
      await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F1] p-4">
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading profile...</p>
        </main>
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
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                        className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
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
                      className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
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
                        className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
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
                        className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                    />
                </div>
              </div>
            </div>

            {/* Password & Security Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-[#232521] mb-4">
                Password & Security
              </h2>
              <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                        type="password"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        disabled={isEditMode}
                        className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                        type="password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                        disabled={isEditMode}
                        className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                        disabled={isEditMode}
                        className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                    />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                  <SecondaryButton 
                    onClick={() => setPasswordData({ current: '', new: '', confirm: '' })}
                    disabled={isEditMode}
                  >
                    Clear
                  </SecondaryButton>
                  <PrimaryButton 
                    onClick={handlePasswordChange}
                    disabled={isEditMode}
                  >
                    Update Password
                  </PrimaryButton>
              </div>
            </div>

          </div>
          
        </PageCard>
      </main>
    </div>
  );
}
