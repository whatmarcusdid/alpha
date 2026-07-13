'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { BookServiceLogo } from '@/lib/book-service/BookServiceHeader';
import {
  Home,
  Building,
  FileText,
  Settings,
  ChevronDown,
  LogOut,
} from 'lucide-react';

const desktopNavTabs = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Company', href: '/dashboard/my-company', icon: Building },
  { name: 'Transactions', href: '/dashboard/transactions', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    setShowUserDropdown(false);
    router.push('/signin');
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (showUserDropdown) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserDropdown]);

  const userDropdown = (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowUserDropdown(!showUserDropdown);
        }}
        className="flex h-14 w-[100px] items-center justify-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100 lg:h-[65px]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A8A]">
          <span className="text-sm font-semibold text-white">{userInitial}</span>
        </div>
        <ChevronDown className="h-6 w-6 text-gray-950" />
      </button>

      {showUserDropdown && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <Link
            href="/dashboard/profile"
            className="block border-b border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] font-semibold text-white">
                {userInitial}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-950">{userDisplayName}</div>
                <div className="text-sm text-zinc-600">{userEmail}</div>
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center space-x-2 px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4 text-zinc-600" />
            <span className="text-sm font-medium text-gray-950">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden w-full px-8 pt-6 pb-6 lg:block">
        <div className="flex w-full items-center justify-between">
          <div className="shrink-0">
            <BookServiceLogo href="/dashboard" />
          </div>

          <div className="flex items-center gap-3">
            {desktopNavTabs.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex w-[130px] flex-col items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold tracking-[-0.14px] transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-[#2920A5]'
                      : 'text-gray-950 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {userDropdown}
        </div>
      </nav>

      {/* Tablet + Mobile Top Bar — logo and profile only */}
      <div className="px-5 py-4 lg:hidden md:px-6">
        <div className="flex items-center justify-between">
          <BookServiceLogo href="/dashboard" />
          {userDropdown}
        </div>
      </div>

      {/* Tablet + Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-8px_20px_rgba(85,85,85,0.05)] lg:hidden">
        <div className="flex items-center justify-center gap-2 px-4 py-3 md:gap-3 md:px-6">
          {desktopNavTabs.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-3 py-2 text-[10px] font-semibold tracking-[-0.1px] transition-colors md:w-[130px] md:flex-none md:gap-2 md:text-sm md:tracking-[-0.14px] ${
                  isActive
                    ? 'bg-gray-200 text-[#2920A5]'
                    : 'text-gray-950 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="h-20 lg:hidden" />
    </>
  );
}
