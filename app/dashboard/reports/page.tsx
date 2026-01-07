'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { getReportsForUser, Report } from '@/lib/firestore/reports';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { PageCard } from '@/components/layout/PageCard';

interface ReportWithDate extends Omit<Report, 'createdDate' | 'updatedDate'> {
  createdDate: Date;
  updatedDate: Date;
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<ReportWithDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'performance' | 'traffic'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'createdDate' | 'updatedDate'>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const unsubscribe = onAuthStateChange(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getReportsForUser(user.uid)
        .then(fetchedReports => {
          const reportsWithDates = fetchedReports.map(report => ({
            ...report,
            createdDate: new Date(report.createdDate),
            updatedDate: new Date(report.updatedDate),
          }));
          setReports(reportsWithDates);
        })
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

  const handleSort = (field: 'title' | 'createdDate' | 'updatedDate') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    if (filter === 'performance') return report.type === 'performance';
    if (filter === 'traffic') return report.type === 'traffic';
    return true;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'createdDate') {
      comparison = a.createdDate.getTime() - b.createdDate.getTime();
    } else if (sortBy === 'updatedDate') {
      comparison = a.updatedDate.getTime() - b.updatedDate.getTime();
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageCard>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#232521]">Reports</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedReports.length} result{sortedReports.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="filter" className="text-sm font-medium text-gray-700">Filter by:</label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'performance' | 'traffic')}
              className="min-h-[40px] px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">Show All</option>
              <option value="performance">Performance Reports</option>
              <option value="traffic">Website Traffic Reports</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full border border-gray-200 rounded-lg">
            <div className="w-full bg-[#F7F6F1] px-6 py-3 grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
              <button
                onClick={() => handleSort('title')}
                className="col-span-5 text-left hover:text-[#1b4a41] transition-colors flex items-center gap-1"
              >
                Document Title
                {sortBy === 'title' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
              
              <button
                onClick={() => handleSort('createdDate')}
                className="col-span-2 text-left hover:text-[#1b4a41] transition-colors flex items-center gap-1"
              >
                Created Date
                {sortBy === 'createdDate' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
              
              <button
                onClick={() => handleSort('updatedDate')}
                className="col-span-2 text-left hover:text-[#1b4a41] transition-colors flex items-center gap-1"
              >
                Updated Date
                {sortBy === 'updatedDate' && (
                  <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
              
              <div className="col-span-3 text-right">Action</div>
            </div>
            
            {loading ? (
              <div className="text-center py-16 text-gray-600">Loading reports...</div>
            ) : sortedReports.length === 0 ? (
              <div className="text-center py-16 px-6">
                <h2 className="text-lg font-semibold text-[#232521]">Your first report is coming soon</h2>
                <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                  Once we capture all relevant data from your site, your report will appear here, ready to download.
                </p>
              </div>
            ) : (
              <div>
                {sortedReports.map((report) => (
                  <div key={report.id} className="w-full px-6 py-4 grid grid-cols-12 gap-4 items-center border-b border-gray-200 last:border-b-0 hover:bg-[#F2F0E7] transition-colors">
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
                        onClick={() => handleDownload({
                          ...report,
                          createdDate: report.createdDate.toISOString(),
                          updatedDate: report.updatedDate.toISOString()
                        })}
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
      </PageCard>
    </main>
  );
}
