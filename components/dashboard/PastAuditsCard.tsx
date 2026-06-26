'use client';

import { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { app } from '@/lib/firebase';

type AuditReport = {
  id: string;
  createdAt: Date;
  summary: string | null;
  reportUrl: string | null;
  fileUrl: string | null;
};

type Props = {
  userId: string;
};

function formatAuditDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function PastAuditsCard({ userId }: Props) {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const {
      getFirestore,
      collection,
      query,
      where,
      orderBy,
      limit,
      onSnapshot,
    } = require('firebase/firestore');

    if (!app) {
      setHasLoaded(true);
      return;
    }

    const firestore = getFirestore(app);
    const reportsRef = collection(firestore, 'users', userId, 'reports');
    const reportsQuery = query(
      reportsRef,
      where('type', '==', 'audit'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
        const nextReports: AuditReport[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdTimestamp = data.createdAt as { toDate?: () => Date } | undefined;
          const createdAt = createdTimestamp?.toDate?.() ?? new Date();

          return {
            id: docSnap.id,
            createdAt,
            summary: typeof data.summary === 'string' ? data.summary : null,
            reportUrl: typeof data.reportUrl === 'string' ? data.reportUrl : null,
            fileUrl: typeof data.fileUrl === 'string' ? data.fileUrl : null,
          };
        });

        setReports(nextReports);
        setHasLoaded(true);
      },
      (error: Error) => {
        console.error('[PastAuditsCard] snapshot error:', error);
        setReports([]);
        setHasLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  if (!hasLoaded || reports.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
        Past audits
      </h2>

      <div className="flex flex-col gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-start gap-6 rounded-lg border-2 border-gray-200 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold leading-[1.2] tracking-[-0.18px] text-gray-950 lg:text-xl lg:tracking-[-0.2px]">
                Site audit — {formatAuditDate(report.createdAt)}
              </p>
              {report.summary != null && (
                <p className="mt-2 text-sm tracking-[-0.14px] leading-[1.5] text-gray-950">
                  {report.summary}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-4">
              {report.reportUrl != null && (
                <a
                  href={report.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
                  aria-label="Open audit report"
                >
                  <ArrowTopRightOnSquareIcon className="h-6 w-6 text-blue-700" />
                </a>
              )}
              {report.fileUrl != null && (
                <a
                  href={report.fileUrl}
                  download
                  className="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
                  aria-label="Download audit report"
                >
                  <ArrowDownTrayIcon className="h-6 w-6 text-blue-700" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
