import Link from 'next/link';

import type { AdminHomeJob } from '@/lib/fix-jobs/home-bucketing';
import {
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
} from '@/lib/fix-jobs/admin-stage-styles';
import { formatRelativeUpdatedAt } from '@/lib/fix-jobs/home-bucketing';

type Props = {
  job: AdminHomeJob;
};

export function FixJobCard({ job }: Props) {
  return (
    <Link
      href={`/admin/fix-jobs/${job.sessionId}?uid=${encodeURIComponent(job.uid)}`}
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
          <span className="whitespace-nowrap">{formatRelativeUpdatedAt(job.updatedAt)}</span>
          <span>{job.displayId}</span>
        </div>
      </div>

      <div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs tracking-[-0.12px] ${STAGE_BADGE_CLASS[job.stage]}`}
        >
          {STAGE_LABELS[job.stage]}
        </span>
      </div>
    </Link>
  );
}
