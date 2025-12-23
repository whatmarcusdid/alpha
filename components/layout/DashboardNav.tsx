'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
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
import { TSGLogo } from '@/components/ui/TSGLogo';

const navItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'My Company', href: '/dashboard/my-company', icon: Building },
  { name: 'Sites', href: '/dashboard/sites', icon: MonitorSmartphone },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Support', href: '/dashboard/support', icon: Headphones },
  { name: 'Transactions', href: '/dashboard/transactions', icon: FileText },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
    router.push('/signin');
  };

  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false);
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const userDropdown = (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
        className="flex items-center space-x-2 min-w-[112px] min-h-[71px] justify-center hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#1b4a41] flex items-center justify-center">
          <span className="text-white text-sm font-semibold">M</span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-600" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#1b4a41] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Marcus White</p>
              <p className="text-sm text-gray-500 truncate">whitem0824@gmail.com</p>
            </div>
          </div>

          <div className="border-t border-gray-200 my-2"></div>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-left flex items-center space-x-2 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Navigation - Top Bar */}
      <nav className="hidden lg:block bg-transparent">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <TSGLogo />
            </div>

            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex flex-col items-center min-w-[112px] min-h-[71px] justify-center rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-[#D9D5C5]/40 text-[#1B4A41] hover:bg-[#D9D5C5]/40' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                className={`flex items-center justify-center min-w-[112px] min-h-[71px] rounded-lg transition-colors ${pathname === '/dashboard/settings' ? 'bg-[#D9D5C5]/40 text-[#1B4A41]' : 'hover:bg-gray-50'}`}
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar - Logo + User */}
      <div className="lg:hidden bg-transparent">
        <div className="px-4 h-16 flex items-center justify-between">
          <TSGLogo />
          <div className="flex items-center space-x-2">
            {userDropdown}
            <Link href="/dashboard/settings">
              <Settings className="h-5 w-5 text-gray-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-medium transition-colors ${isActive 
                    ? 'text-[#1B4A41]' 
                    : 'text-gray-600'
                  }`}>
                <Icon className="h-5 w-5 mb-1" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
