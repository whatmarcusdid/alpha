'use client';

import React from 'react';
import { TertiaryButton } from '@/components/ui/TertiaryButton';
import { ChevronDown } from 'lucide-react';

export interface Report {
  id: string;
  title: string;
  subtitle: string;
  createdDate: string;
  updatedDate: string;
  fileUrl?: string;
}

export interface ReportsTableProps {
  reports: Report[];
  onDownload?: (report: Report) => void;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: () => void;
}

export const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  onDownload,
  sortOrder = 'desc',
  onSortChange,
}) => {
  const handleDownload = (report: Report) => {
    if (onDownload) {
      onDownload(report);
    } else if (report.fileUrl) {
      window.open(report.fileUrl, '_blank');
    }
  };

  return (
    <div className="w-full -mx-4 sm:mx-0">
      <div className="overflow-x-auto">
        <div className="min-w-[729px] bg-white">
        {/* Table Header */}
        <div className="bg-[#F7F6F1] flex items-center justify-between px-[18px] py-1 w-full">
          {/* Document Title */}
          <div className="flex items-center py-1 rounded-md w-[350px] min-w-[350px] flex-shrink-0">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
              Document Title
            </p>
          </div>

          {/* Created Date */}
          <button
            onClick={onSortChange}
            className="flex items-center gap-1 py-1 rounded-md w-[150px] min-w-[150px] flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
              Created Date
            </p>
            <ChevronDown 
              size={20} 
              className={`text-[#232521] transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Updated Date */}
          <div className="flex items-center gap-1 py-1 rounded-md w-[150px] min-w-[150px] flex-shrink-0">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
              Updated Date
            </p>
          </div>

          {/* Action */}
          <div className="flex items-center py-1 rounded-md w-[79px] min-w-[79px] flex-shrink-0">
            <p className="font-semibold text-[15px] text-[#232521] leading-[1.5] tracking-tight whitespace-nowrap">
              Action
            </p>
          </div>
        </div>

        {/* Table Rows */}
        <div className="flex flex-col">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white border-b border-l border-r border-[rgba(111,121,122,0.4)] flex items-center justify-between p-[18px] w-full hover:bg-[#F2F0E7] transition-colors"
            >
              {/* Document Title Column */}
              <div className="flex gap-4 items-center w-[350px] min-w-[350px] flex-shrink-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-bold text-[16px] text-[#232521] leading-[1.5] tracking-tight truncate">
                    {report.title}
                  </p>
                  <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-tight truncate">
                    {report.subtitle}
                  </p>
                </div>
              </div>

              {/* Created Date Column */}
              <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-tight whitespace-nowrap w-[150px] min-w-[150px] flex-shrink-0">
                {report.createdDate}
              </p>

              {/* Updated Date Column */}
              <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-tight whitespace-nowrap w-[150px] min-w-[150px] flex-shrink-0">
                {report.updatedDate}
              </p>

              {/* Action Column */}
              <div className="flex items-center justify-center w-[79px] min-w-[79px] flex-shrink-0">
                <TertiaryButton onClick={() => handleDownload(report)}>
                  Download
                </TertiaryButton>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {reports.length === 0 && (
          <div className="bg-white border-b border-l border-r border-[rgba(111,121,122,0.4)] flex items-center justify-center p-12 w-full min-w-[729px]">
            <p className="font-medium text-[15px] text-[#545552] leading-[1.2] tracking-tight">
              No reports available
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

