'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import Link from 'next/link';
import { onAuthStateChange } from '@/lib/auth';
import { getRecentReportsForUser, Report } from '@/lib/firestore/reports';
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

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
    <div className="bg-white">
      <h2 className="text-lg font-bold leading-tight tracking-tight text-[#232521] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Reports</h2>
      
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
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex p-[18px] justify-between items-center self-stretch rounded border border-[rgba(111,121,122,0.4)] bg-white"
              style={{
                borderRadius: '4px',
                border: '1px solid rgba(111, 121, 122, 0.40)',
                background: '#FFF'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold leading-relaxed tracking-tight text-[#232521]">{report.title}</h3>
                  <p className="text-[15px] font-medium leading-tight tracking-tight text-[#545552]">{formatDate(report.createdDate)}</p>
                </div>
              </div>
              <TertiaryButton onClick={() => handleDownload(report.fileUrl)}>
                Download
              </TertiaryButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
