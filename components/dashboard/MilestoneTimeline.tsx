'use client';

import { CheckIcon } from '@heroicons/react/24/solid';

export type MilestoneStatus = 'complete' | 'current' | 'upcoming';

type Props = {
  inviteStatus: 'pending' | 'sent' | 'accepted' | null;
  accessStatus: 'needed' | 'received' | null;
  deliveryStatus: 'in_progress' | 'delivered' | null;
  allPillarsDone?: boolean;
};

const MILESTONES = [
  'Payment Confirmed',
  'Access Collected',
  'Work Started',
  'Fix Delivered',
] as const;

function deriveMilestoneStatuses({
  accessStatus,
  deliveryStatus,
  allPillarsDone = false,
}: Pick<Props, 'accessStatus' | 'deliveryStatus' | 'allPillarsDone'>): MilestoneStatus[] {
  const paymentConfirmed: MilestoneStatus = 'complete';

  let accessCollected: MilestoneStatus;
  if (accessStatus === 'received') {
    accessCollected = 'complete';
  } else if (deliveryStatus === 'in_progress') {
    accessCollected = 'current';
  } else {
    accessCollected = 'upcoming';
  }

  let workStarted: MilestoneStatus;
  if (allPillarsDone || deliveryStatus === 'delivered') {
    workStarted = 'complete';
  } else if (deliveryStatus === 'in_progress' && accessStatus === 'received') {
    workStarted = 'current';
  } else {
    workStarted = 'upcoming';
  }

  const fixDelivered: MilestoneStatus =
    deliveryStatus === 'delivered' ? 'complete' : 'upcoming';

  return [paymentConfirmed, accessCollected, workStarted, fixDelivered];
}

function MilestoneCircle({ status }: { status: MilestoneStatus }) {
  if (status === 'complete') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
        <CheckIcon className="h-4 w-4 text-white" aria-hidden="true" />
      </div>
    );
  }

  if (status === 'current') {
    return (
      <div className="relative flex h-8 w-8 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-blue-400 opacity-60 animate-pulse"
          aria-hidden="true"
        />
        <div className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-600 bg-white" />
      </div>
    );
  }

  return (
    <div
      className="h-8 w-8 rounded-full border-2 border-gray-300 bg-white"
      aria-hidden="true"
    />
  );
}

function Connector({
  isComplete,
  orientation,
}: {
  isComplete: boolean;
  orientation: 'horizontal' | 'vertical';
}) {
  const colorClass = isComplete ? 'bg-blue-600' : 'bg-gray-300';

  if (orientation === 'vertical') {
    return <div className={`mx-auto h-6 w-0.5 shrink-0 ${colorClass}`} aria-hidden="true" />;
  }

  return (
    <div
      className={`hidden min-w-[1rem] flex-1 self-center h-0.5 md:block ${colorClass}`}
      aria-hidden="true"
    />
  );
}

export function MilestoneTimeline({
  accessStatus,
  deliveryStatus,
  allPillarsDone = false,
}: Props) {
  if (deliveryStatus == null) {
    return (
      <p className="text-sm leading-[1.5] tracking-[-0.14px] text-zinc-600">
        Your project is getting set up — check back shortly.
      </p>
    );
  }

  const statuses = deriveMilestoneStatuses({ accessStatus, deliveryStatus, allPillarsDone });

  return (
    <div className="w-full" aria-label="Project milestone timeline">
      {/* Mobile: vertical stack */}
      <div className="flex flex-col md:hidden">
        {MILESTONES.map((label, index) => (
          <div key={label} className="flex flex-col items-center">
            <MilestoneCircle status={statuses[index]} />
            <p
              className={`mt-2 text-center text-sm leading-[1.5] tracking-[-0.14px] ${
                statuses[index] === 'upcoming' ? 'text-gray-400' : 'text-gray-950'
              }`}
            >
              {label}
            </p>
            {index < MILESTONES.length - 1 && (
              <Connector
                isComplete={statuses[index] === 'complete'}
                orientation="vertical"
              />
            )}
          </div>
        ))}
      </div>

      {/* Desktop: horizontal row */}
      <div className="hidden md:flex md:w-full md:items-start">
        {MILESTONES.map((label, index) => (
          <div key={label} className="contents">
            {index > 0 && (
              <Connector
                isComplete={statuses[index - 1] === 'complete'}
                orientation="horizontal"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col items-center px-1">
              <MilestoneCircle status={statuses[index]} />
              <p
                className={`mt-2 text-center text-sm leading-[1.5] tracking-[-0.14px] ${
                  statuses[index] === 'upcoming' ? 'text-gray-400' : 'text-gray-950'
                }`}
              >
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function parseInviteStatus(value: string | null | undefined): Props['inviteStatus'] {
  if (value === 'pending' || value === 'sent' || value === 'accepted') {
    return value;
  }

  return null;
}

function deriveAccessStatus(
  siteFix: Record<string, unknown> | null | undefined
): Props['accessStatus'] {
  if (!siteFix) return null;

  if (siteFix.onboardingStatus === 'delivery_ready') {
    return 'received';
  }

  const accessRequest =
    siteFix.access_request && typeof siteFix.access_request === 'object'
      ? (siteFix.access_request as Record<string, unknown>)
      : null;

  if (accessRequest?.submittedAt != null || accessRequest?.status === 'submitted') {
    return 'received';
  }

  if (siteFix.onboardingStatus === 'awaiting_access') {
    return 'needed';
  }

  return null;
}

export function parseMilestoneTimelineProps(params: {
  siteFix: Record<string, unknown> | null | undefined;
  deliveryStatus: 'in_progress' | 'delivered' | null;
  allPillarsDone?: boolean;
}): Pick<Props, 'inviteStatus' | 'accessStatus' | 'deliveryStatus' | 'allPillarsDone'> {
  const siteFix = params.siteFix;

  return {
    inviteStatus: parseInviteStatus(
      siteFix != null && typeof siteFix.inviteStatus === 'string'
        ? siteFix.inviteStatus
        : null
    ),
    accessStatus: deriveAccessStatus(siteFix),
    deliveryStatus: params.deliveryStatus,
    allPillarsDone: params.allPillarsDone ?? false,
  };
}
