'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  getStatusBadgeLabel,
  getStatusBadgeVariant,
  type StatusBadgeVariant,
} from '@/lib/fix-jobs/bucketing';
import { toExternalHref } from '@/lib/fix-jobs/urls';
import type { SerializedFixJob } from '@/lib/fix-jobs/serialize';
import { parseSerializedFixJob } from '@/lib/fix-jobs/serialize';

type Props = {
  job: SerializedFixJob;
  hideDelete?: boolean;
};

const badgeStyles: Record<StatusBadgeVariant, string> = {
  not_started: 'bg-gray-200 text-gray-900',
  in_progress: 'bg-[#FEF9C3] text-[#713F12]',
  done: 'bg-[#DCFCE7] text-[#166534]',
};

function formatCreatedDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));
}

export function FixJobHeader({ job, hideDelete = false }: Props) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const parsedJob = parseSerializedFixJob(job);
  const badgeVariant = getStatusBadgeVariant(parsedJob);
  const siteHref = toExternalHref(job.primaryWebsiteUrl);

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${job.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setDeleteError(payload.error ?? 'Failed to delete job.');
        return;
      }

      router.push('/admin/fix-jobs');
    } catch {
      setDeleteError('Failed to delete job. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm leading-[1.5] tracking-[-0.14px]">
        <Link href="/admin/fix-jobs" className="text-[#1D4ED8] hover:underline">
          Home
        </Link>
        <span className="mx-2 text-zinc-400">&gt;</span>
        <span className="font-semibold text-[#545552]">{job.displayId}</span>
      </nav>

      <section className="mb-6 rounded border border-[rgba(111,121,122,0.4)] bg-white p-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-[32px] leading-[1.2] tracking-[-0.32px] text-[#232521]">
              {job.businessName}
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href={siteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-[1.5] tracking-[-0.14px] text-zinc-600 hover:underline"
              >
                {job.primaryWebsiteUrl}
              </a>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs tracking-[-0.12px] ${badgeStyles[badgeVariant]}`}
              >
                {getStatusBadgeLabel(parsedJob)}
              </span>
            </div>

            <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#545552]">
              Fix Job • {job.displayId}
            </p>
            <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#545552]">
              Created {formatCreatedDate(job.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href={siteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border-2 border-[#1D4ED8] px-6 py-2 text-base font-semibold uppercase text-[#1D4ED8] hover:bg-blue-50"
            >
              View Site
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
            </a>
            {!hideDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border-2 border-[#E7000B] px-6 py-2 text-base font-semibold uppercase text-[#E7000B] hover:bg-red-50"
              >
                Delete Job
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close delete confirmation"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-950">Delete this job?</h2>
            <p className="mt-2 text-base leading-[1.5] text-zinc-600">
              This cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="min-h-[40px] rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-950"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="min-h-[40px] rounded-lg bg-[#E7000B] px-6 py-2 font-semibold text-white disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
