'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Building, 
  MonitorSmartphone, 
  BarChart3, 
  Headphones, 
  FileText,
  Settings,
  ChevronDown,
  LogOut,
  Menu
} from 'lucide-react';
import { TSGLogo } from '@/components/ui/logo';

const mainNavItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'My Company', href: '/dashboard/my-company', icon: Building },
  { name: 'Sites', href: '/dashboard/sites', icon: MonitorSmartphone },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
];

const moreNavItems = [
  { name: 'Support', href: '/dashboard/support', icon: Headphones },
  { name: 'Transactions', href: '/dashboard/transactions', icon: FileText },
];

const allNavItems = [...mainNavItems, ...moreNavItems];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Get user display info
  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    setShowUserDropdown(false);
    router.push('/signin');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        setShowUserDropdown(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserDropdown]);

  const userDropdown = (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowUserDropdown(!showUserDropdown);
        }}
        className="flex items-center space-x-2 min-w-[112px] min-h-[71px] justify-center hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#1b4a41] flex items-center justify-center">
          <span className="text-white text-sm font-semibold">{userInitial}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-600" />
      </button>

      {showUserDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <Link 
              href="/dashboard/profile"
              className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-200"
            >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1b4a41] flex items-center justify-center text-white font-semibold">
                {userInitial}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#232521]">{userDisplayName}</div>
                <div className="text-sm text-gray-600">{userEmail}</div>
              </div>
            </div>
            </Link>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 text-left flex items-center space-x-2 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  const moreMenu = (
    <div className="relative" ref={moreMenuRef}>
      <button
        onClick={(e) => {
            e.stopPropagation();
            setShowMoreMenu(!showMoreMenu);
        }}
        className={`flex flex-col items-center justify-center p-5 rounded-lg transition-colors ${
            showMoreMenu || moreNavItems.some(item => pathname === item.href)
            ? 'text-[#1B4A41] bg-[#D9D5C5]/40' 
            : 'text-gray-600 hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40'
        }`}>
        <Menu className="w-6 h-6 mb-1" />
        <span className="text-base font-medium whitespace-nowrap">More</span>
      </button>

      {showMoreMenu && (
        <div className="absolute bottom-full right-0 mb-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {moreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setShowMoreMenu(false)}
                className={`flex items-center px-4 py-3 text-base font-medium transition-colors ${
                    isActive 
                    ? 'text-[#1B4A41] bg-gray-100' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Navigation - Top Bar */}
      <nav className="hidden lg:block bg-transparent mt-4">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <TSGLogo />
            </div>

            <div className="flex items-center space-x-1">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex flex-col items-center min-w-[112px] min-h-[71px] justify-center rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-[#D9D5C5]/40 text-[#1B4A41]' 
                        : 'text-gray-600 hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40'
                      }
                    `}>
                    <Icon className="h-5 w-5 mb-1" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-4">
              {userDropdown}
              <Link 
                href="/dashboard/settings"
                className={`flex items-center justify-center min-w-[112px] min-h-[71px] rounded-lg transition-colors ${
                  pathname === '/dashboard/settings' 
                    ? 'bg-[#D9D5C5]/40 text-[#1B4A41]' 
                    : 'text-gray-600 hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40'
                }`}
              >
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar - Logo + User */}
      <div className="lg:hidden bg-transparent mt-4">
        <div className="px-4 h-16 flex items-center justify-between">
          <TSGLogo />
          <div className="flex items-center space-x-2">
            {userDropdown}
            <Link 
              href="/dashboard/settings"
              className="hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40 rounded-lg p-2 transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 bg-white z-50 shadow-[0_8px_20px_0_rgba(85,85,85,0.10)] tablet:left-[104px] tablet:bottom-4 tablet:rounded-lg mobile:left-0 mobile:right-0 tablet-sm:left-0 tablet-sm:right-0">
        <div className="flex justify-center items-center gap-3 p-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center p-5 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-[#1B4A41] bg-[#D9D5C5]/40' 
                    : 'text-gray-600 hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-base font-medium whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            );
          })}
          {moreMenu}
        </div>
      </nav>

      {/* Content padding to prevent overlap with bottom nav on mobile */}
      <div className="h-0 lg:hidden tablet:h-0" />
    </>
  );
}
