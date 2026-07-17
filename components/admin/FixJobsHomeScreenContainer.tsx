'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { FixJobsHomeScreen } from '@/components/admin/FixJobsHomeScreen';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import { mapListItemToAdminHomeJob } from '@/lib/fix-jobs/map-list-item-to-home-job';
import type { FixJobListItem } from '@/lib/types/fix-session';
import { useAuth } from '@/contexts/AuthContext';

type ApiResponse = {
  success: boolean;
  data: {
    jobs: FixJobListItem[];
  };
  error?: string;
};

export function FixJobsHomeScreenContainer() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<ReturnType<typeof mapListItemToAdminHomeJob>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const adminFirstName = useMemo(() => {
    const displayName = user?.displayName?.trim();
    if (displayName) {
      return displayName.split(/\s+/)[0] ?? 'Admin';
    }

    const emailLocal = user?.email?.split('@')[0];
    return emailLocal || 'Admin';
  }, [user?.displayName, user?.email]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth('/api/admin/fix-jobs?stage=all');
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load fix jobs');
      }

      setJobs(payload.data.jobs.map(mapListItemToAdminHomeJob));
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to load fix jobs';
      setError(message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    void fetchJobs();
  }, [authLoading, user, fetchJobs]);

  if (authLoading || !user) {
    return <div className="py-12 text-zinc-600">Loading fix jobs…</div>;
  }

  if (loading) {
    return <div className="py-12 text-zinc-600">Loading fix jobs…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
        <button
          type="button"
          onClick={() => void fetchJobs()}
          className="mt-3 min-h-[40px] rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return <FixJobsHomeScreen jobs={jobs} adminFirstName={adminFirstName} />;
}
