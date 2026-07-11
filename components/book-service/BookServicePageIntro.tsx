'use client';

import {
  BookServiceBreadcrumb,
  type BookServiceBreadcrumbItem,
} from '@/components/book-service/BookServiceBreadcrumb';
import { ratch } from '@/lib/fonts/ratch';

export type BookServicePageIntroProps = {
  breadcrumbItems: BookServiceBreadcrumbItem[];
  title: string;
  description: string;
};

export function BookServicePageIntro({
  breadcrumbItems,
  title,
  description,
}: BookServicePageIntroProps) {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-1">
      <BookServiceBreadcrumb items={breadcrumbItems} />
      <h1
        className={`${ratch.className} text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#030712]`}
      >
        {title}
      </h1>
      <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
        {description}
      </p>
    </div>
  );
}
