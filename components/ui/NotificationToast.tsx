'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface NotificationToastProps {
  show: boolean;
  type: 'success' | 'error';
  message: string;
  subtitle?: string;
  onDismiss: () => void;
  duration?: number;
}

export function NotificationToast({
  show,
  type,
  message,
  subtitle,
  onDismiss,
  duration = 5000,
}: NotificationToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onDismiss]);

  if (!show) return null;

  return (
    <div 
      className="fixed top-[118px] right-9 z-50 animate-fade-in"
      style={{
        width: '459px',
        borderRadius: '8px',
        borderTop: '1px solid rgba(111, 121, 122, 0.40)',
        background: '#FFF',
        boxShadow: '0 -1px 20px 0 rgba(85, 85, 85, 0.10)',
      }}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {type === 'success' ? (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none"
              className="flex-shrink-0"
              style={{ aspectRatio: '1/1' }}
            >
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M19.801 10.222C19.931 10.794 20 11.389 20 12C20 16.415 16.415 20 12 20C7.585 20 4 16.415 4 12C4 7.585 7.585 4 12 4C12.923 4 13.809 4.156 14.634 4.444C15.155 4.626 15.725 4.351 15.907 3.83C16.089 3.308 15.814 2.738 15.293 2.556C14.261 2.196 13.153 2 12 2C6.481 2 2 6.481 2 12C2 17.519 6.481 22 12 22C17.519 22 22 17.519 22 12C22 11.237 21.914 10.493 21.752 9.778C21.629 9.24 21.093 8.903 20.555 9.025C20.017 9.147 19.679 9.683 19.801 10.222ZM11 12.586L19.293 4.293C19.683 3.903 20.317 3.903 20.707 4.293C21.097 4.683 21.097 5.317 20.707 5.707L11.707 14.707C11.317 15.098 10.683 15.098 10.293 14.707L7.293 11.707C6.903 11.317 6.903 10.683 7.293 10.293C7.683 9.903 8.317 9.903 8.707 10.293L11 12.586Z" 
                fill="#00A63E"
              />
            </svg>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none"
              className="flex-shrink-0"
            >
              <path 
                d="M21.8338 18.2022L13.8909 4.33467C13.4243 3.50999 12.5346 3 11.5905 3C10.6465 3 9.76756 3.50999 9.29012 4.33467L1.33638 18.213C1.11936 18.5928 1 19.0268 1 19.4717C1 20.8607 2.1285 22 3.52827 22H19.6311C21.02 22 22.1593 20.8607 22.1593 19.4717C22.1593 19.0377 22.04 18.6037 21.823 18.213L21.8338 18.2022ZM19.6419 20.3615H3.53912C3.03998 20.3615 2.63849 19.96 2.63849 19.4609C2.63849 19.309 2.6819 19.1462 2.75785 19.016L10.7116 5.13764C10.8961 4.82296 11.2324 4.62764 11.6014 4.62764C11.9703 4.62764 12.3067 4.82296 12.4911 5.13764L20.434 19.0051C20.51 19.1462 20.5534 19.2981 20.5534 19.45C20.5534 19.9492 20.1519 20.3507 19.6528 20.3507L19.6419 20.3615Z" 
                fill="#E7000B"
              />
              <path 
                d="M11.5902 14.6107C12.0351 14.6107 12.404 14.2418 12.404 13.7969V10.3246C12.404 9.87967 12.0351 9.51074 11.5902 9.51074C11.1453 9.51074 10.7764 9.87967 10.7764 10.3246V13.7969C10.7764 14.2418 11.1453 14.6107 11.5902 14.6107Z" 
                fill="#E7000B"
              />
              <path 
                d="M11.5907 17.9197C12.0702 17.9197 12.4588 17.5311 12.4588 17.0517C12.4588 16.5722 12.0702 16.1836 11.5907 16.1836C11.1113 16.1836 10.7227 16.5722 10.7227 17.0517C10.7227 17.5311 11.1113 17.9197 11.5907 17.9197Z" 
                fill="#E7000B"
              />
            </svg>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <p 
            className="text-[#232521]"
            style={{
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: '150%',
              letterSpacing: '-0.14px',
            }}
          >
            {message}
          </p>
          {subtitle && (
            <p 
              className="text-[#545552] mt-1"
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '150%',
                letterSpacing: '-0.14px',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-[#737373] hover:text-[#232521] transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
