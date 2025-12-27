'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { getReportsForUser, Report } from '@/lib/firestore/reports';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Show All');

  useEffect(() => {
    const unsubscribe = onAuthStateChange(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getReportsForUser(user.uid)
        .then(setReports)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleDownload = (report: Report) => {
    window.open(report.fileUrl, '_blank');
  };

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'Show All') return true;
    if (filter === 'Performance Reports' && report.type === 'performance') return true;
    if (filter === 'Security Reports' && report.type === 'security') return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-[#F7F6F1] p-4">
      <DashboardNav />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#232521]">Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">
                {filteredReports.length} result{filteredReports.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="filter" className="text-sm font-medium text-gray-700">Filter by:</label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4a41]"
              >
                <option>Show All</option>
                <option>Performance Reports</option>
                <option>Security Reports</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-full border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-6 py-3 grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div className="col-span-5">Document Title</div>
                <div className="col-span-2">Created Date ▼</div>
                <div className="col-span-2">Updated Date</div>
                <div className="col-span-3 text-right">Action</div>
              </div>
              
              {loading ? (
                <div className="text-center py-16 text-gray-600">Loading reports...</div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <h2 className="text-lg font-semibold text-[#232521]">Your first report is coming soon</h2>
                  <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                    Once we capture all relevant data from your site, your report will appear here, ready to download.
                  </p>
                </div>
              ) : (
                <div>
                  {filteredReports.map((report) => (
                    <div key={report.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                      <div className="col-span-5 flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                           <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#232521]">{report.title}</p>
                          <p className="text-sm text-gray-600">{report.subtitle}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600">{formatDate(report.createdDate)}</div>
                      <div className="col-span-2 text-sm text-gray-600">{formatDate(report.updatedDate)}</div>
                      <div className="col-span-3 text-right">
                        <button 
                          onClick={() => handleDownload(report)}
                          className="text-[#1b4a41] font-semibold hover:text-[#0f3830] transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
