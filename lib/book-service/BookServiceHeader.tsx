'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function BookServiceLogoLink({
  variant = 'default',
}: {
  variant?: 'default' | 'large';
}) {
  const textClassName =
    variant === 'large'
      ? 'text-[25px] font-bold uppercase leading-[1.5] text-[#030712]'
      : 'text-sm font-bold uppercase tracking-widest text-[#0F172A]';

  return (
    <Link href="/audit" className="flex items-center gap-2">
      <ShieldCheck className="size-6 shrink-0 text-[#1E3A8A]" aria-hidden />
      <span className={textClassName}>Book Service</span>
    </Link>
  );
}

export function BookServiceHeader() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="flex items-center px-6 py-4 md:px-10">
        <BookServiceLogoLink />
      </div>
    </header>
  );
}
