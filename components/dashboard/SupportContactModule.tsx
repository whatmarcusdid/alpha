'use client';

import {
  DocumentDuplicateIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/config';

const sectionHeadingClass =
  'text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]';

const supportRowClass =
  'flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-white p-4';

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
      aria-label={`Copy ${label}`}
    >
      <DocumentDuplicateIcon className="h-6 w-6 text-blue-700" />
    </button>
  );
}

export function SupportContactModule() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className={sectionHeadingClass}>Support</h2>

      <div className="flex flex-col gap-4">
        <div className={supportRowClass}>
          <PhoneIcon className="h-6 w-6 shrink-0 text-gray-950" aria-hidden="true" />
          <p className="flex-1 text-base leading-[1.5] text-gray-950 lg:text-lg">Call us</p>
          <div className="flex items-center gap-3">
            <p className="max-w-[127px] truncate text-sm tracking-[-0.14px] text-zinc-600 md:max-w-none md:whitespace-nowrap">
              {SUPPORT_PHONE}
            </p>
            <CopyButton value={SUPPORT_PHONE} label="phone number" />
          </div>
        </div>

        <div className={`${supportRowClass} items-end`}>
          <ChatBubbleLeftIcon className="h-6 w-6 shrink-0 text-gray-950" aria-hidden="true" />
          <p className="flex-1 text-base leading-[1.5] text-gray-950 lg:text-lg">Text us</p>
          <div className="flex items-center gap-3">
            <p className="max-w-[127px] truncate text-sm tracking-[-0.14px] text-zinc-600 md:max-w-none md:whitespace-nowrap">
              {SUPPORT_PHONE}
            </p>
            <CopyButton value={SUPPORT_PHONE} label="text number" />
          </div>
        </div>

        <div className={supportRowClass}>
          <EnvelopeIcon className="h-6 w-6 shrink-0 text-gray-950" aria-hidden="true" />
          <p className="flex-1 text-base leading-[1.5] text-gray-950 lg:text-lg">Email us</p>
          <div className="flex min-w-0 items-center gap-3">
            <p className="truncate text-sm tracking-[-0.14px] text-zinc-600">
              {SUPPORT_EMAIL}
            </p>
            <CopyButton value={SUPPORT_EMAIL} label="email address" />
          </div>
        </div>
      </div>
    </div>
  );
}
