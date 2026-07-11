'use client';

import Link from 'next/link';

export type BookServiceBreadcrumbItem = {
  label: string;
  href?: string;
};

export type BookServiceBreadcrumbProps = {
  items: BookServiceBreadcrumbItem[];
};

export function BookServiceBreadcrumb({ items }: BookServiceBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm leading-[1.5] tracking-[-0.14px]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <span className="font-normal text-[#a1a1aa]" aria-hidden>
                  &gt;
                </span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-semibold text-[#52525b] transition-colors hover:text-[#2920a5]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? 'font-semibold text-[#2920a5]'
                      : 'font-semibold text-[#52525b]'
                  }
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
