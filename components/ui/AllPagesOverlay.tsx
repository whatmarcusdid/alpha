'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, Building, MonitorSmartphone, BarChart3, Headphones, FileText, User, Settings } from 'lucide-react';

export interface AllPagesNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const allPagesNavItems: AllPagesNavItem[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Company', href: '/dashboard/my-company', icon: Building },
  { name: 'Sites', href: '/dashboard/sites', icon: MonitorSmartphone },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Support', href: '/dashboard/support', icon: Headphones },
  { name: 'Transactions', href: '/dashboard/transactions', icon: FileText },
  { name: 'My Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface AllPagesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllPagesOverlay({ isOpen, onClose }: AllPagesOverlayProps) {
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Overlay panel */}
      <div
        ref={overlayRef}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-[0_-8px_20px_0_rgba(85,85,85,0.10)] max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-pages-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b border-gray-200">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close All Pages menu"
          >
            <X className="w-6 h-6 text-[#232521]" />
          </button>
          <h2 id="all-pages-title" className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-[#232521]">
            All Pages
          </h2>
          <div className="w-10" aria-hidden="true" />
        </div>

        {/* Grid of nav items */}
        <div className="overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-5">
            {allPagesNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex flex-col items-center justify-center py-4 px-2 rounded-lg transition-colors min-h-[80px] ${
                    isActive
                      ? 'text-[#1B4A41] bg-[#D9D5C5]/40'
                      : 'text-[#232521] hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40'
                  }`}
                >
                  <Icon className="w-8 h-8 mb-2" />
                  <span className="text-sm font-medium text-center">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
