'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function BookServiceNavLogo() {
  return (
    <Link href="/audit" className="inline-flex">
      <Image
        src="/brand/book-service-nav-logo.png"
        alt="Book Service"
        width={194}
        height={25}
        priority
        className="h-[25px] w-auto"
      />
    </Link>
  );
}

function BookServiceBackButton({
  href,
  label = 'Back',
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[#2920a5] px-6 py-2 text-base font-bold leading-[1.5] text-[#2920a5] shadow-[4px_8px_24px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#f4f3ff]"
    >
      <ArrowLeft className="size-6 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

export type BookServiceHeaderProps = {
  /** `bar` = bordered header row (book-service flow). `inline` = logo only for audit pages. */
  variant?: 'bar' | 'inline';
  /** When set on `bar`, renders the Back button in the header row (Figma select/review layout). */
  backHref?: string;
  backLabel?: string;
};

export function BookServiceHeader({
  variant = 'bar',
  backHref,
  backLabel = 'Back',
}: BookServiceHeaderProps) {
  if (variant === 'inline') {
    return (
      <div className="flex w-full shrink-0 items-center">
        <BookServiceNavLogo />
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-20 w-full border-b border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-between px-8 py-6">
        <BookServiceNavLogo />
        {backHref ? (
          <BookServiceBackButton href={backHref} label={backLabel} />
        ) : null}
      </div>
    </header>
  );
}
