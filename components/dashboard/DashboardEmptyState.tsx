'use client';

import type { ReactNode } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

type Props = {
  icon?: ReactNode;
  headline: string;
  body: string;
  cta?: { label: string; href: string; variant?: 'primary' | 'secondary' };
};

export function DashboardEmptyState({ icon, headline, body, cta }: Props) {
  const CtaButton = cta?.variant === 'secondary' ? SecondaryButton : PrimaryButton;

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
        <CtaButton href={cta.href} className="mt-6">
          {cta.label}
        </CtaButton>
      )}
    </div>
  );
}
