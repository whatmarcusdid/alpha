'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import { normalizeWebsiteUrl, isValidHttpUrl } from '@/lib/fix-jobs/urls';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type FormState = {
  businessName: string;
  primaryWebsiteUrl: string;
};

type DuplicateWarning = {
  displayId: string;
  fixJobId: string;
};

const INPUT_CLASS =
  'min-h-[40px] w-full rounded-md border border-[rgba(111,121,122,0.4)] bg-white px-5 py-3 text-sm leading-[1.5] tracking-[-0.14px] text-gray-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2';

export function CreateFixJobModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ businessName: '', primaryWebsiteUrl: '' });
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isFormValid =
    form.businessName.trim().length > 0 && isValidHttpUrl(form.primaryWebsiteUrl);

  useEffect(() => {
    if (!isOpen) {
      setForm({ businessName: '', primaryWebsiteUrl: '' });
      setDuplicateWarning(null);
      setSubmitError(null);
      setIsSubmitting(false);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isValidHttpUrl(form.primaryWebsiteUrl)) {
      setDuplicateWarning(null);
      return;
    }

    let cancelled = false;

    async function checkDuplicate() {
      try {
        const response = await fetchWithAdminAuth('/api/admin/fix-jobs');
        const payload = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        const jobs = (payload.data?.jobs ?? []) as Array<{
          stage: string;
          siteUrl: string;
          sessionId: string;
        }>;
        const normalizedTarget = normalizeWebsiteUrl(form.primaryWebsiteUrl);
        const duplicate = jobs.find(
          (job) =>
            job.stage !== 'delivered' &&
            job.siteUrl &&
            normalizeWebsiteUrl(job.siteUrl) === normalizedTarget
        );

        if (!cancelled) {
          setDuplicateWarning(
            duplicate
              ? { displayId: duplicate.sessionId, fixJobId: duplicate.sessionId }
              : null
          );
        }
      } catch {
        if (!cancelled) {
          setDuplicateWarning(null);
        }
      }
    }

    void checkDuplicate();

    return () => {
      cancelled = true;
    };
  }, [form.primaryWebsiteUrl, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetchWithAdminAuth('/api/admin/fix-jobs', {
        method: 'POST',
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          primaryWebsiteUrl: form.primaryWebsiteUrl.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setSubmitError(payload.error ?? 'Failed to create fix job.');
        return;
      }

      onClose();
      router.push(`/admin/fix-jobs/${payload.data.fixJobId}`);
    } catch {
      setSubmitError('Failed to create fix job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close modal"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-fix-job-title"
        className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="create-fix-job-title" className="text-2xl leading-[1.2] tracking-[-0.24px] text-gray-950">
          New fix job
        </h2>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-gray-950">
              Business name
            </span>
            <input
              type="text"
              value={form.businessName}
              onChange={(event) =>
                setForm((current) => ({ ...current, businessName: event.target.value }))
              }
              placeholder="e.g. Bright Path Pressure Washing"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-gray-950">
              Primary website URL
            </span>
            <input
              type="url"
              value={form.primaryWebsiteUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, primaryWebsiteUrl: event.target.value }))
              }
              placeholder="e.g. https://brightpathpw.com"
              className={INPUT_CLASS}
            />
          </label>

          {duplicateWarning && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm leading-[1.5] text-amber-900">
              A job for this site already exists ({duplicateWarning.displayId}). You can still
              create a new one.
            </p>
          )}

          {submitError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm leading-[1.5] text-red-800">
              {submitError}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-lg border border-gray-300 px-6 py-2 text-base font-semibold text-gray-950 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="min-h-[40px] rounded-lg bg-[#2563EB] px-6 py-2 text-base font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
