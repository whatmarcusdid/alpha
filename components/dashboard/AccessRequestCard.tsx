'use client';

import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { SUPPORT_EMAIL } from '@/lib/config';

type Props = {
  accessStatus: 'needed' | 'received' | null;
  orderId?: string | null;
};

function buildShareAccessHref(orderId: string | null | undefined): string {
  const subject =
    orderId != null && orderId.length > 0
      ? `Website Access — ${orderId}`
      : 'Website Access';

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export function AccessRequestCard({ accessStatus, orderId }: Props) {
  if (accessStatus == null) {
    return null;
  }

  if (accessStatus === 'received') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <CheckCircleIcon
              className="h-6 w-6 shrink-0 text-green-600"
              aria-hidden="true"
            />
            <h3 className="text-base font-semibold leading-[1.5] text-gray-950 lg:text-lg">
              Access received — we&apos;re getting to work
            </h3>
          </div>
          <p className="text-sm leading-[1.5] tracking-[-0.14px] text-zinc-600">
            Thanks for sharing. Our team now has what they need to begin your fixes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold leading-[1.5] text-gray-950 lg:text-lg">
          We need access to your website
        </h3>
        <p className="text-sm leading-[1.5] tracking-[-0.14px] text-zinc-600">
          To get started on your fixes, we&apos;ll need temporary access to your website. Our team
          will guide you through exactly what to share — no technical knowledge required.
        </p>
        <a
          href={buildShareAccessHref(orderId)}
          className="inline-flex min-h-[40px] w-fit items-center justify-center rounded-lg bg-[#2563EB] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
        >
          Share access details
        </a>
        <p className="text-xs text-gray-500">
          Your credentials are never stored in this dashboard.
        </p>
      </div>
    </div>
  );
}
