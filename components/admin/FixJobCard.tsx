import Link from 'next/link';

import type { FixJob } from '@/lib/types/fix-job';
import {
  formatRelativeUpdatedAt,
  getStatusBadgeLabel,
  getStatusBadgeVariant,
  type StatusBadgeVariant,
} from '@/lib/fix-jobs/bucketing';

type Props = {
  job: FixJob;
};

const badgeStyles: Record<StatusBadgeVariant, string> = {
  not_started: 'bg-gray-200 text-gray-900',
  in_progress: 'bg-[#FEF9C3] text-[#713F12]',
  done: 'bg-[#DCFCE7] text-[#166534]',
};

export function FixJobCard({ job }: Props) {
  const badgeVariant = getStatusBadgeVariant(job);

  return (
    <Link
      href={`/admin/fix-jobs/${job.id}`}
      className="flex w-full flex-col gap-3 rounded border border-[rgba(111,121,122,0.4)] bg-white p-4 transition-colors hover:border-[#1D4ED8] hover:bg-blue-50/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-base font-bold leading-[1.5] text-[#232521]">
            {job.businessName || 'Untitled business'}
          </h3>
          {job.primaryWebsiteUrl ? (
            <span
              role="link"
              tabIndex={0}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const href = job.primaryWebsiteUrl.startsWith('http')
                  ? job.primaryWebsiteUrl
                  : `https://${job.primaryWebsiteUrl}`;
                window.open(href, '_blank', 'noopener,noreferrer');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  const href = job.primaryWebsiteUrl.startsWith('http')
                    ? job.primaryWebsiteUrl
                    : `https://${job.primaryWebsiteUrl}`;
                  window.open(href, '_blank', 'noopener,noreferrer');
                }
              }}
              className="truncate text-sm leading-[1.5] tracking-[-0.14px] text-[#1D4ED8] hover:underline"
            >
              {job.primaryWebsiteUrl}
            </span>
          ) : (
            <p className="text-sm leading-[1.5] tracking-[-0.14px] text-zinc-500">
              No website URL
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3 text-sm leading-[1.5] tracking-[-0.14px] text-[#545552]">
          <span className="whitespace-nowrap">{formatRelativeUpdatedAt(job.lastActivityAt)}</span>
          <span>{job.displayId}</span>
        </div>
      </div>

      <div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs tracking-[-0.12px] ${badgeStyles[badgeVariant]}`}
        >
          {getStatusBadgeLabel(job)}
        </span>
      </div>
    </Link>
  );
}
