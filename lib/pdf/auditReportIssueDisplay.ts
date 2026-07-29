import {
  getPlaybookEntry,
  type AllFixSignalKey,
  type PlaybookEntry,
} from '@/lib/audit/fixPlaybook';

export type AuditPdfIssueDisplay = {
  label: string;
  severity: PlaybookEntry['severity'];
};

/** Presentation-only lookup: issue key → human label + playbook severity. */
export function getIssueDisplay(issueKey: string): AuditPdfIssueDisplay {
  try {
    const entry = getPlaybookEntry(issueKey as AllFixSignalKey);
    return {
      label: entry.title,
      severity: entry.severity,
    };
  } catch {
    return {
      label: issueKey.replace(/_/g, ' '),
      severity: 'moderate',
    };
  }
}

export function severityDotColor(severity: PlaybookEntry['severity']): string {
  switch (severity) {
    case 'critical':
    case 'high':
      return '#e7000b';
    case 'moderate':
      return '#f0b100';
  }
}
