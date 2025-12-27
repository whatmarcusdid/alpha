'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange, signOut, updateUserEmail } from '@/lib/auth';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/firestore/profile';
import { changePassword } from '@/lib/auth/password';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Notification Toast Component (TSG Pattern)
const Notification = ({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void; }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-lg flex items-center justify-between transition-opacity duration-300 z-50";
  const typeClasses = type === 'success' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";

  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 p-1 rounded-full hover:bg-black/10">
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [originalData, setOriginalData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; show: boolean; message: string }>({ type: 'success', show: false, message: '' });
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

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message, show: true });
    setTimeout(() => setNotification({ type: 'success', show: false, message: '' }), 5000);
  };

  const handleSave = async () => {
    if (!formData || !user) return;

    // Validate
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      showNotification('error', 'First name and last name are required');
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        email: formData.email,
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
        <DashboardNav />
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading profile...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F1] p-4">
      <DashboardNav />
      {notification.show && <Notification type={notification.type} message={notification.message} onDismiss={() => setNotification({ ...notification, show: false })} />}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          
          {/* FULL-WIDTH HEADER */}
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-[#232521]">My Profile</h1>
            <div className="flex gap-3">
              {!isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="rounded-full border-2 border-[#1B4A41] bg-white px-6 py-2 text-[#1B4A41] font-bold hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                        type="text"
                        value={formData?.firstName || ''}
                        onChange={(e) => setFormData({ ...formData!, firstName: e.target.value })}
                        disabled={!isEditMode}
                        className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                        type="text"
                        value={formData?.lastName || ''}
                        onChange={(e) => setFormData({ ...formData!, lastName: e.target.value })}
                        disabled={!isEditMode}
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
                    <label className="block text-sm font--medium text-gray-700 mb-2">New Password</label>
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
                <button
                    onClick={() => setPasswordData({ current: '', new: '', confirm: '' })}
                    disabled={isEditMode}
                    className="px-6 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear
                </button>
                <button
                    onClick={handlePasswordChange}
                    disabled={isEditMode}
                    className="px-6 py-2 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Update Password
                </button>
              </div>
            </div>

          </div>
          
        </div>
      </main>
    </div>
  );
}
