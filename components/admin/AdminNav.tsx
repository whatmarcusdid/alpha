'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  CreditCard,
  Eye,
  Home,
  Link2,
  LogOut,
  Settings,
  ShieldCheck,
  Store,
} from 'lucide-react';

import { signOut } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { isPreviewNavEnabled } from '@/lib/preview/env';

type AdminNavTab = {
  name: string;
  href: string;
  icon: typeof Home;
  disabled?: boolean;
};

const adminNavTabs: AdminNavTab[] = [
  { name: 'Home', href: '/admin', icon: Home },
  {
    name: 'Needs Link',
    href: '/admin/needs-audit-lead-link',
    icon: Link2,
  },
  { name: 'Clients', href: '/admin/clients', icon: Store, disabled: true },
  { name: 'Audits', href: '/admin/audits', icon: CreditCard, disabled: true },
  { name: 'Settings', href: '/admin/settings', icon: Settings, disabled: true },
];

const previewNavTab: AdminNavTab = {
  name: 'Preview',
  href: '/admin/preview/admin-dashboard?state=job-setup-empty',
  icon: Eye,
};

function isTabActive(pathname: string, href: string): boolean {
  if (href.startsWith('/admin/preview/')) {
    return pathname.startsWith('/admin/preview/');
  }

  if (href === '/admin') {
    return pathname === '/admin';
  }

  if (href === '/admin/fix-jobs') {
    return pathname.startsWith('/admin/fix-jobs');
  }

  return pathname.startsWith(href);
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const showPreviewLink = isPreviewNavEnabled();

  const visibleNavTabs = showPreviewLink ? [...adminNavTabs, previewNavTab] : adminNavTabs;

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Admin';
  const userEmail = user?.email || '';
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = () => {
      if (showUserDropdown) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserDropdown]);

  async function handleSignOut() {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined);
    await signOut();
    setShowUserDropdown(false);
    router.push('/signin');
  }

  const userDropdown = (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setShowUserDropdown(!showUserDropdown);
        }}
        className="flex h-14 w-[100px] items-center justify-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100 lg:h-[65px]"
        aria-expanded={showUserDropdown}
        aria-haspopup="menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A8A]">
          <span className="text-sm font-semibold text-white">{userInitial}</span>
        </div>
        <ChevronDown className="h-6 w-6 text-gray-950" aria-hidden="true" />
      </button>

      {showUserDropdown && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] font-semibold text-white">
                {userInitial}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-950">{userDisplayName}</div>
                <div className="text-sm text-zinc-600">{userEmail}</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center space-x-2 px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4 text-zinc-600" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-950">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  function renderNavTab(item: AdminNavTab) {
    const Icon = item.icon;
    const isActive = isTabActive(pathname, item.href);
    const className = `flex w-[130px] flex-col items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold tracking-[-0.14px] transition-colors ${
      isActive
        ? 'bg-gray-200 text-[#1D4ED8]'
        : 'text-gray-950 hover:bg-gray-100'
    } ${item.disabled ? 'pointer-events-none opacity-50' : ''}`;

    if (item.disabled) {
      return (
        <div key={item.name} className={className} aria-disabled="true">
          <Icon className={`h-6 w-6 ${isActive ? 'text-[#1D4ED8]' : ''}`} aria-hidden="true" />
          <span>{item.name}</span>
        </div>
      );
    }

    return (
      <Link key={item.name} href={item.href} className={className}>
        <span className="relative">
          <Icon className={`h-6 w-6 ${isActive ? 'text-[#1D4ED8]' : ''}`} aria-hidden="true" />
          {item.name === 'Preview' && (
            <span className="absolute -right-2 -top-1 rounded bg-[#1D4ED8] px-1 text-[9px] font-bold uppercase text-white">
              Dev
            </span>
          )}
        </span>
        <span>{item.name}</span>
      </Link>
    );
  }

  return (
    <>
      <nav className="hidden px-6 pt-6 lg:block">
        <div className="mx-auto flex max-w-[1408px] items-center justify-between">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#1E3A8A]" aria-hidden="true" />
            <span className="text-[25px] font-bold uppercase leading-[1.5] tracking-wide text-gray-950">
              Book Service
            </span>
          </Link>

          <div className="flex items-center gap-3">{visibleNavTabs.map(renderNavTab)}</div>

          {userDropdown}
        </div>
      </nav>

      <div className="px-5 py-4 lg:hidden md:px-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#1E3A8A]" aria-hidden="true" />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-950">
              Book Service
            </span>
          </Link>
          {userDropdown}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-8px_20px_rgba(85,85,85,0.05)] lg:hidden">
        <div className="flex items-center justify-center gap-2 px-4 py-3 md:gap-3 md:px-6">
          {visibleNavTabs.map((item) => {
            const Icon = item.icon;
            const isActive = isTabActive(pathname, item.href);

            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-3 py-2 text-[10px] font-semibold tracking-[-0.1px] text-gray-400 md:w-[130px] md:flex-none md:gap-2 md:text-sm md:tracking-[-0.14px]"
                >
                  <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-3 py-2 text-[10px] font-semibold tracking-[-0.1px] transition-colors md:w-[130px] md:flex-none md:gap-2 md:text-sm md:tracking-[-0.14px] ${
                  isActive
                    ? 'bg-gray-200 text-[#1D4ED8]'
                    : 'text-gray-950 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
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
