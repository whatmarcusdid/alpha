// components/layout/Header.tsx
import Link from 'next/link';

export function Header() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="flex items-center px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" fill="#1E3A8A" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-bold tracking-widest text-[#0F172A] uppercase">
            Book Service
          </span>
        </Link>
      </div>
    </header>
  );
}
