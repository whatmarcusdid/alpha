'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Home, 
  Briefcase, 
  Globe, 
  BarChart3 as BarChart, 
  Menu 
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/my-company', label: 'My Company', icon: Briefcase },
  { href: '/dashboard/sites', label: 'Sites', icon: Globe },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart },
  { href: '/dashboard/more', label: 'More', icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-[#1B4A41] bg-[#9be382]/10' 
                    : 'text-gray-600 hover:text-[#1B4A41]'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content padding to prevent overlap */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
