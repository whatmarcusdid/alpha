'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import type { UnlinkedAuditLeadRecord } from '@/lib/types/admin-linking';

type ApiResponse = {
  success: boolean;
  data: UnlinkedAuditLeadRecord[];
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return '—';
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function recordTypeLabel(type: UnlinkedAuditLeadRecord['type']): string {
  return type === 'order' ? 'Order' : 'Account';
}

function recordIdLabel(type: UnlinkedAuditLeadRecord['type']): string {
  return type === 'order' ? 'Order ID' : 'User ID';
}

function LoadingSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1024px] w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm text-zinc-600">
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Record ID</th>
            <th className="px-4 py-3 font-medium">Customer email</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Audit Lead ID</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100">
              {Array.from({ length: 6 }).map((__, cellIndex) => (
                <td key={cellIndex} className="px-4 py-4">
                  <div className="h-4 animate-pulse rounded bg-gray-200" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UnlinkedAuditLeadsScreen() {
  const [records, setRecords] = useState<UnlinkedAuditLeadRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth('/api/admin/unlinked-audit-leads');
      const payload = (await response.json()) as ApiResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load unlinked records');
      }

      setRecords(payload.data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load unlinked records';
      setError(message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const isEmpty = !loading && !error && records.length === 0;
  const orderCount = records.filter((record) => record.type === 'order').length;
  const accountCount = records.filter((record) => record.type === 'account').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.24px] text-gray-950">
          Needs Audit Lead Link
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Orders and accounts that completed successfully but could not be linked to an
          audit lead document. Fix these manually in the Firestore console.
        </p>
      </div>

      {!loading && !error && records.length > 0 && (
        <p className="text-sm text-zinc-600">
          {orderCount} unlinked order{orderCount === 1 ? '' : 's'}
          {orderCount > 0 && accountCount > 0 ? ' · ' : ''}
          {accountCount > 0
            ? `${accountCount} unlinked account${accountCount === 1 ? '' : 's'}`
            : null}
        </p>
      )}

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => void fetchRecords()}
            className="mt-3 min-h-[40px] rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {isEmpty && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-zinc-600">
          Nothing to link right now.
        </p>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[1024px] w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-zinc-600">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Record ID</th>
                <th className="px-4 py-3 font-medium">Customer email</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Audit Lead ID</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={`${record.type}-${record.recordId}`} className="border-b border-gray-100">
                  <td className="px-4 py-4 align-top">
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                      {recordTypeLabel(record.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {recordIdLabel(record.type)}
                    </p>
                    <p className="font-mono text-sm text-gray-950">{record.recordId}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-gray-950">
                    {record.customerEmail || '—'}
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-gray-950">
                    {record.sku ?? 'N/A'}
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-zinc-600">
                    {formatDate(record.createdAt)}
                  </td>
                  <td className="px-4 py-4 align-top font-mono text-sm text-gray-950">
                    {record.auditLeadId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
