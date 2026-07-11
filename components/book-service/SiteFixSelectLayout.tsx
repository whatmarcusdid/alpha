'use client';

import type { ReactNode } from 'react';

import { BookServicePageIntro } from '@/components/book-service/BookServicePageIntro';
import type { BookServiceBreadcrumbItem } from '@/components/book-service/BookServiceBreadcrumb';
import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';

export type SiteFixSelectLayoutProps = {
  breadcrumbItems: BookServiceBreadcrumbItem[];
  backHref: string;
  pageTitle: string;
  pageDescription: string;
  children: ReactNode;
  contentClassName?: string;
  contentMaxWidthClassName?: string;
};

export function SiteFixSelectLayout({
  breadcrumbItems,
  backHref,
  pageTitle,
  pageDescription,
  children,
  contentClassName = '',
  contentMaxWidthClassName = 'max-w-[900px]',
}: SiteFixSelectLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <BookServiceHeader variant="bar" backHref={backHref} />
      <main className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col gap-16 px-6 pb-[120px] pt-10 md:px-[140px]">
        <BookServicePageIntro
          breadcrumbItems={breadcrumbItems}
          title={pageTitle}
          description={pageDescription}
        />
        <div
          className={`mx-auto w-full ${contentMaxWidthClassName} ${contentClassName}`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
