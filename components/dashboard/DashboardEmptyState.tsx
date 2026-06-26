'use client';

import type { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  headline: string;
  body: string;
  cta?: { label: string; href: string };
};

const actionLinkClass =
  'mt-6 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#2563EB] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1D4ED8]';

export function DashboardEmptyState({ icon, headline, body, cta }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      {icon != null && <div className="mb-4 flex justify-center">{icon}</div>}
      <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px]">
        {headline}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5] tracking-[-0.14px] text-zinc-600">
        {body}
      </p>
      {cta != null && (
        <a href={cta.href} className={actionLinkClass}>
          {cta.label}
        </a>
      )}
    </div>
  );
}
