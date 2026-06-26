'use client';

import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ClockIcon, MinusIcon } from '@heroicons/react/24/outline';
import {
  getReadinessBadge,
  hasAnyOnboardingField,
  ONBOARDING_FIELDS,
  type AccessItemStatus,
  type OnboardingData,
} from '@/lib/types/onboarding';

type Props = {
  onboarding: OnboardingData | null;
};

const sectionHeadingClass =
  'text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]';

function ChecklistItemIcon({ status }: { status: AccessItemStatus }) {
  if (status === 'provided' || status === 'confirmed') {
    return <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />;
  }

  if (status === 'needed') {
    return <ClockIcon className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />;
  }

  return <MinusIcon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />;
}

function ChecklistItem({
  label,
  status,
}: {
  label: string;
  status: NonNullable<AccessItemStatus>;
}) {
  const isNotNeeded = status === 'not_needed';
  const isNeeded = status === 'needed';

  return (
    <li className="flex gap-3">
      <ChecklistItemIcon status={status} />
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className={`text-sm leading-[1.5] ${
            isNotNeeded
              ? 'text-gray-400 line-through'
              : isNeeded
                ? 'font-medium text-amber-700'
                : 'text-gray-900'
          }`}
        >
          {label}
        </p>
        {isNeeded && (
          <p className="text-xs leading-[1.5] text-amber-700">
            Waiting on this — reach out if you need help
          </p>
        )}
      </div>
    </li>
  );
}

export function OnboardingChecklist({ onboarding }: Props) {
  if (onboarding == null || !hasAnyOnboardingField(onboarding)) {
    return null;
  }

  const readinessBadge = getReadinessBadge(onboarding);
  const visibleItems = ONBOARDING_FIELDS.flatMap(({ key, label }) => {
    const status = onboarding[key];
    if (status == null) {
      return [];
    }

    return [{ key, label, status }];
  });

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className={sectionHeadingClass}>Getting started</h2>
        {readinessBadge === 'ready' && (
          <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Ready for work
          </span>
        )}
        {readinessBadge === 'action' && (
          <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Action needed
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        {visibleItems.map(({ key, label, status }) => (
          <ChecklistItem key={key} label={label} status={status} />
        ))}
      </ul>
    </section>
  );
}
