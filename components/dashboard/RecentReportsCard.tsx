'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import Link from 'next/link';
import { onAuthStateChange } from '@/lib/auth';
import { getRecentReportsForUser, Report } from '@/lib/firestore/reports';
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface ReportWithDate extends Omit<Report, 'createdDate' | 'updatedDate'> {
  createdDate: Date;
  updatedDate: Date;
}

export function RecentReportsCard() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<ReportWithDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getRecentReportsForUser(user.uid)
        .then((fetchedReports) => {
          const reportsWithDates = fetchedReports.map(report => ({
            ...report,
            createdDate: new Date(report.createdDate),
            updatedDate: new Date(report.updatedDate),
          }));
          setReports(reportsWithDates);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-[#232521] mb-4">Recent Reports</h2>
      
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-base font-semibold text-[#232521] mb-2">
            Your first report is coming soon
          </p>
          <p className="text-sm text-gray-600">
            Once we capture all relevant data from your site, your report will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {reports.map((report) => (
            <li key={report.id} className="py-3 flex items-center justify-between hover:bg-[#F2F0E7] transition-colors rounded-md px-2 -mx-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-[#232521]">{report.title}</p>
                  <p className="text-sm text-gray-500">{formatDate(report.createdDate)}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDownload(report.fileUrl)}
                className="text-[#1b4a41] font-semibold hover:text-[#0f3830] transition-colors text-sm"
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <Link href="/dashboard/reports" className="text-[#1b4a41] font-semibold text-sm inline-flex items-center gap-1 hover:text-[#0f3830] transition-colors">
          View All Reports <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
