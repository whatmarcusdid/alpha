'use client';

import { useState, useEffect } from 'react';
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
  LogOut
} from 'lucide-react';
import { TSGLogo } from '@/components/ui/logo';
import { AllPagesOverlay } from '@/components/ui/AllPagesOverlay';

const mainNavItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Company', href: '/dashboard/my-company', icon: Building },
  { name: 'Sites', href: '/dashboard/sites', icon: MonitorSmartphone },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
];

const moreNavItems = [
  { name: 'Support', href: '/dashboard/support', icon: Headphones },
  { name: 'Transactions', href: '/dashboard/transactions', icon: FileText },
];

const allNavItems = [...mainNavItems, ...moreNavItems];

function SeeAllIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12.325 1.05859C6.0625 1.05859 1 6.12109 1 12.3836C1 18.6461 6.0625 23.7461 12.325 23.7461C18.5875 23.7461 23.6875 18.6461 23.6875 12.3836C23.6875 6.12109 18.5875 1.05859 12.325 1.05859ZM12.325 22.0586C7 22.0586 2.6875 17.7086 2.6875 12.3836C2.6875 7.05859 7 2.74609 12.325 2.74609C17.65 2.74609 22 7.09609 22 12.4211C22 17.7086 17.65 22.0586 12.325 22.0586Z" fill="currentColor"/>
      <path d="M12.9248 9.30781C12.5873 8.97031 12.0623 8.97031 11.7248 9.30781L6.6623 14.2578C6.3248 14.5953 6.3248 15.1203 6.6623 15.4578C6.8123 15.6078 7.0373 15.7203 7.2623 15.7203C7.4873 15.7203 7.6748 15.6453 7.8623 15.4953L12.3248 11.0703L16.7873 15.4578C17.1248 15.7953 17.6498 15.7953 17.9873 15.4578C18.3248 15.1203 18.3248 14.5953 17.9873 14.2578L12.9248 9.30781Z" fill="currentColor"/>
    </svg>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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
    <div className="relative flex-1 min-w-[64px] flex">
      <button
        onClick={(e) => {
            e.stopPropagation();
            setShowMoreMenu(!showMoreMenu);
        }}
                className={`flex flex-col items-center justify-center p-5 rounded-lg transition-colors w-full min-w-[64px] ${
            showMoreMenu || moreNavItems.some(item => pathname === item.href)
            ? 'text-[#1B4A41] bg-[#D9D5C5]/40' 
            : 'text-[#232521] hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40'
        }`}>
        <SeeAllIcon className="w-6 h-6 mb-1" />
        <span className="text-sm font-medium whitespace-nowrap">See All</span>
      </button>

      <AllPagesOverlay isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} />
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
              className="hidden hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40 rounded-lg p-2 transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white z-50 shadow-[0_8px_20px_0_rgba(85,85,85,0.10)] tablet:left-[104px] tablet:right-0 tablet:bottom-4 tablet:rounded-lg tablet-sm:left-0 tablet-sm:right-0">
        <div className="flex justify-center items-center gap-3 p-2 w-full">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center p-5 rounded-lg transition-colors min-w-[64px] flex-1 ${
                  isActive 
                    ? 'text-[#1B4A41] bg-[#D9D5C5]/40' 
                    : 'text-[#232521] hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            );
          })}
          <div className="w-px self-stretch bg-[rgba(111,121,122,0.4)] shrink-0" aria-hidden="true" />
          {moreMenu}
        </div>
      </nav>

      {/* Content padding to prevent overlap with bottom nav on mobile */}
      <div className="h-0 lg:hidden tablet:h-0" />
    </>
  );
}
