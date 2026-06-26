'use client';

import { useEffect, useState } from 'react';
import {
  LockClosedIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { DocumentIcon as DocumentIconSolid } from '@heroicons/react/24/solid';
import { SUPPORT_EMAIL } from '@/lib/config';

type Props = {
  reportUrl: string | null;
  loomUrl: string | null;
  deliveryStatus: 'in_progress' | 'delivered' | null;
};

type LinkAvailability = 'checking' | 'available' | 'unavailable';

const sectionHeadingClass =
  'text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]';

const actionLinkClass =
  'inline-flex min-h-[40px] w-fit items-center justify-center rounded-lg bg-[#2563EB] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1D4ED8]';

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function useLinkAvailability(url: string | null): LinkAvailability {
  const [availability, setAvailability] = useState<LinkAvailability>('checking');

  useEffect(() => {
    if (url == null || url.length === 0) {
      setAvailability('checking');
      return;
    }

    if (!isValidHttpUrl(url)) {
      setAvailability('unavailable');
      return;
    }

    let cancelled = false;
    setAvailability('checking');

    fetch(url, { method: 'HEAD' })
      .then((response) => {
        if (cancelled) return;
        setAvailability(response.ok ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (cancelled) return;
        setAvailability('available');
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return availability;
}

function UnavailableMessage({ label }: { label: string }) {
  return (
    <p className="text-sm text-gray-800">
      {label} link unavailable —{' '}
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="font-semibold text-blue-600 hover:text-blue-700"
      >
        contact support
      </a>
    </p>
  );
}

type ReadyLinkProps = {
  url: string;
  label: string;
  download?: boolean;
  unavailableLabel: string;
};

function ReadyLink({ url, label, download = false, unavailableLabel }: ReadyLinkProps) {
  const linkAvailability = useLinkAvailability(url);

  if (linkAvailability === 'checking') {
    return <p className="text-sm text-gray-600">Checking link…</p>;
  }

  if (linkAvailability === 'unavailable') {
    return <UnavailableMessage label={unavailableLabel} />;
  }

  return (
    <a
      href={url}
      className={actionLinkClass}
      {...(download ? { download: true } : {})}
      {...(!download ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  );
}

function ReportDeliverable({ reportUrl }: { reportUrl: string | null }) {
  if (reportUrl == null || reportUrl.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <LockClosedIcon className="h-6 w-6 shrink-0 text-gray-400" aria-hidden="true" />
          <p className="text-sm leading-[1.5] text-zinc-600">
            Your fix report will appear here once delivery is complete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="flex items-start gap-3">
        <DocumentIconSolid className="h-6 w-6 shrink-0 text-green-600" aria-hidden="true" />
        <ReadyLink
          url={reportUrl}
          label="Download report"
          download
          unavailableLabel="Report"
        />
      </div>
    </div>
  );
}

function LoomDeliverable({ loomUrl }: { loomUrl: string | null }) {
  if (loomUrl == null || loomUrl.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <PlayIcon className="h-6 w-6 shrink-0 text-gray-400" aria-hidden="true" />
          <p className="text-sm leading-[1.5] text-zinc-600">
            A video walkthrough of your fixes will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="flex items-start gap-3">
        <PlayIcon className="h-6 w-6 shrink-0 text-green-600" aria-hidden="true" />
        <ReadyLink url={loomUrl} label="Watch walkthrough" unavailableLabel="Walkthrough" />
      </div>
    </div>
  );
}

export function DeliverablesModule({
  reportUrl,
  loomUrl,
  deliveryStatus,
}: Props) {
  if (deliveryStatus == null) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className={sectionHeadingClass}>Your deliverables</h2>

      <div className="flex flex-col gap-3">
        <ReportDeliverable reportUrl={reportUrl} />
        <LoomDeliverable loomUrl={loomUrl} />
      </div>
    </section>
  );
}
