'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { changePassword } from '@/lib/auth/password';
import { trackEvent } from '@/lib/analytics';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type FormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type FormErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Password strength helpers
  const getPasswordStrength = (password: string): 'none' | 'weak' | 'medium' | 'strong' => {
    if (password.length === 0) return 'none';
    if (password.length < 8) return 'weak';
    if (password.length < 12) return 'medium';
    return 'strong';
  };

  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength(formData.newPassword);
    if (strength === 'weak') return 'text-red-500';
    if (strength === 'medium') return 'text-yellow-500';
    if (strength === 'strong') return 'text-green-500';
    return '';
  };

  const getPasswordStrengthText = () => {
    const strength = getPasswordStrength(formData.newPassword);
    if (strength === 'weak') return '⚠️ Weak password (min 8 characters)';
    if (strength === 'medium') return '✓ Medium strength';
    if (strength === 'strong') return '✓ Strong password';
    return '';
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    // Track analytics
    trackEvent('password_change_initiated', {});

    try {
      const result = await changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (result.success) {
        // Track success
        trackEvent('password_change_success', {});

        // Clear form
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setErrors({});

        // Show success (parent component handles toast)
        onSuccess?.();

        // Close modal after brief delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Track failure
        trackEvent('password_change_failed', {
          error: result.error || 'unknown',
        });

        // Show error in form
        setErrors({
          currentPassword: result.error || 'Failed to change password',
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
      trackEvent('password_change_failed', {
        error: 'exception',
      });
      setErrors({
        currentPassword: 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleFocusTrap);
      modalRef.current?.focus();
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative flex w-[600px] flex-col items-start gap-6 rounded-lg bg-white p-6 shadow-[0_8px_20px_0_rgba(85,85,85,0.10)]"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-4">
          <h2 className="text-xl font-semibold">Change Password</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-4 w-full">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              disabled={isLoading}
              className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4A41] disabled:bg-gray-100"
              placeholder="Enter your current password"
            />
            {errors.currentPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              disabled={isLoading}
              className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4A41] disabled:bg-gray-100"
              placeholder="Enter your new password"
            />
            {/* Password strength indicator */}
            {formData.newPassword && (
              <p className={`text-sm mt-1 ${getPasswordStrengthColor()}`}>
                {getPasswordStrengthText()}
              </p>
            )}
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              disabled={isLoading}
              className="w-full min-h-[40px] px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4A41] disabled:bg-gray-100"
              placeholder="Confirm your new password"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end w-full pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 font-semibold disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
