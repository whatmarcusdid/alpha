import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import { getAppBaseUrl } from '@/lib/base-url';
import type { Grade, SecurityFlag, SecurityFlagTier } from '@/lib/types/audit';
import { getResultsHeadline } from '@/lib/types/audit';
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';

import {
  getIssueDisplay,
  severityDotColor,
} from './auditReportIssueDisplay';

/** Max issues rendered per pillar on the single-page results layout. */
const MAX_ISSUES_PER_PILLAR = 6;

export type AuditReportData = {
  firstName: string;
  businessName: string;
  websiteUrl: string;
  auditDate: string;
  speedGrade: Grade | 'N/A';
  speedScore: number;
  speedTopIssues: string[];
  speedNarrative: string;
  securityGrade: Grade | 'N/A';
  securityFlags: SecurityFlag[];
  securityFlagTier: SecurityFlagTier;
  securityNarrative: string;
  seoGrade: Grade | 'N/A';
  seoScore: number;
  seoFailingSignals: SeoFailingSignalKey[];
  seoNarrative: string;
  pricingUrl: string;
};

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return '#00A63E';
    case 'B':
      return '#65a30d';
    case 'C':
      return '#f0b100';
    case 'D':
    case 'F':
      return '#e7000b';
    case 'N/A':
    default:
      return '#6b7280';
  }
}

function displayHost(websiteUrl: string): string {
  return websiteUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function pdfFooterBranding(): { brandLine: string; hostLine: string } {
  const baseUrl = getAppBaseUrl();
  const host = baseUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return {
    brandLine: 'Book Service',
    hostLine: host,
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#232521',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
  },
  coverFill: {
    flexGrow: 1,
  },
  coverBusiness: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#0c0a28',
    marginBottom: 6,
  },
  coverUrl: {
    fontSize: 10,
    color: '#52525b',
    marginBottom: 20,
  },
  coverLabel: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0c0a28',
    marginBottom: 4,
  },
  coverDate: {
    fontSize: 10,
    color: '#52525b',
  },
  coverFooter: {
    marginTop: 'auto',
    paddingTop: 20,
    fontSize: 9,
    color: '#9ca3af',
  },
  resultsPage: {
    padding: 28,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#232521',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
  },
  resultsRoot: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  eyebrow: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2920a5',
    marginBottom: 8,
  },
  headline: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0c0a28',
    lineHeight: 1.25,
    marginBottom: 6,
  },
  metaLine: {
    fontSize: 9,
    color: '#52525b',
    marginBottom: 16,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
    minWidth: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  pillarTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0c0a28',
  },
  gradeCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  gradeLetter: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  gradeNaBar: {
    width: 28,
    height: 3,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    marginBottom: 4,
  },
  gradeDescriptor: {
    fontSize: 8,
    color: '#52525b',
    textAlign: 'center',
    marginTop: 4,
  },
  narrative: {
    fontSize: 8,
    lineHeight: 1.35,
    color: '#52525b',
  },
  issuesHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#030712',
    marginTop: 2,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 3,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  issueLabel: {
    flex: 1,
    fontSize: 7.5,
    lineHeight: 1.3,
    color: '#030712',
  },
  allClearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  allClearDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00A63E',
  },
  allClearText: {
    fontSize: 7.5,
    color: '#030712',
  },
  overflowNote: {
    fontSize: 7,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  unavailableText: {
    fontSize: 8,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  resultsFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

type AuditReportDocumentProps = {
  data: AuditReportData;
};

function GradeBadge({
  grade,
  descriptor,
}: {
  grade: Grade | 'N/A';
  descriptor: string;
}) {
  return (
    <View style={styles.gradeCard}>
      {grade === 'N/A' ? (
        <View style={styles.gradeNaBar} />
      ) : (
        <Text style={[styles.gradeLetter, { color: gradeColor(grade) }]}>
          {grade}
        </Text>
      )}
      <Text style={styles.gradeDescriptor}>{descriptor}</Text>
    </View>
  );
}

function IssueBullet({ issueKey }: { issueKey: string }) {
  const { label, severity } = getIssueDisplay(issueKey);
  return (
    <View style={styles.issueRow}>
      <View
        style={[
          styles.severityDot,
          { backgroundColor: severityDotColor(severity) },
        ]}
      />
      <Text style={styles.issueLabel}>{label}</Text>
    </View>
  );
}

function AllClearMessage({ message }: { message: string }) {
  return (
    <View style={styles.allClearRow}>
      <View style={styles.allClearDot} />
      <Text style={styles.allClearText}>{message}</Text>
    </View>
  );
}

function IssueList({
  grade,
  issueKeys,
  allClearMessage,
  showAllClear,
}: {
  grade: Grade | 'N/A';
  issueKeys: string[];
  allClearMessage: string;
  showAllClear: boolean;
}) {
  if (grade === 'N/A') {
    return <Text style={styles.unavailableText}>Score unavailable</Text>;
  }

  if (issueKeys.length === 0) {
    if (showAllClear) {
      return <AllClearMessage message={allClearMessage} />;
    }
    return null;
  }

  const visible = issueKeys.slice(0, MAX_ISSUES_PER_PILLAR);
  const overflow = issueKeys.length - visible.length;

  return (
    <>
      <Text style={styles.issuesHeading}>Top issues found</Text>
      {visible.map((key) => (
        <IssueBullet key={key} issueKey={key} />
      ))}
      {overflow > 0 ? (
        <Text style={styles.overflowNote}>
          + {overflow} more issue{overflow === 1 ? '' : 's'} in your full report
        </Text>
      ) : null}
    </>
  );
}

function PillarColumn({
  title,
  grade,
  descriptor,
  narrative,
  issueKeys,
  allClearMessage,
  showAllClear,
}: {
  title: string;
  grade: Grade | 'N/A';
  descriptor: string;
  narrative: string;
  issueKeys: string[];
  allClearMessage: string;
  showAllClear: boolean;
}) {
  return (
    <View style={styles.column}>
      <Text style={styles.pillarTitle}>{title}</Text>
      <GradeBadge grade={grade} descriptor={descriptor} />
      <Text style={styles.narrative}>{narrative}</Text>
      <IssueList
        grade={grade}
        issueKeys={issueKeys}
        allClearMessage={allClearMessage}
        showAllClear={showAllClear}
      />
    </View>
  );
}

export function AuditReportDocument({ data }: AuditReportDocumentProps) {
  const footer = pdfFooterBranding();
  const host = displayHost(data.websiteUrl);

  const headline = getResultsHeadline(data.firstName, {
    speedGrade: data.speedGrade,
    securityGrade: data.securityGrade,
    seoGrade: data.seoGrade,
  });

  const speedDescriptor =
    data.speedGrade === 'N/A'
      ? 'Score unavailable'
      : `Score: ${data.speedScore}/100`;
  const securityDescriptor =
    data.securityGrade === 'N/A'
      ? 'Scan unavailable'
      : data.securityGrade === 'F'
        ? 'Site is flagged as unsafe'
        : data.securityFlags.length === 0
          ? '0 flags found'
          : `${data.securityFlags.length} flag${data.securityFlags.length === 1 ? '' : 's'} found`;
  const seoDescriptor =
    data.seoGrade === 'N/A'
      ? 'Score unavailable'
      : `${data.seoScore}/9 checks passed`;

  const speedShowAllClear =
    data.speedGrade !== 'N/A' &&
    data.speedTopIssues.length === 0 &&
    data.speedScore >= 90;
  const securityShowAllClear =
    data.securityGrade !== 'N/A' && data.securityFlags.length === 0;
  const seoShowAllClear =
    data.seoGrade !== 'N/A' && data.seoFailingSignals.length === 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.coverFill}>
          <Text style={styles.coverBusiness}>{data.businessName}</Text>
          <Text style={styles.coverUrl}>{data.websiteUrl}</Text>
          <Text style={styles.coverLabel}>Book Service Site Audit</Text>
          <Text style={styles.coverDate}>{data.auditDate}</Text>
        </View>
        <Text style={styles.coverFooter}>
          {footer.brandLine} · {footer.hostLine}
        </Text>
      </Page>

      <Page size="LETTER" style={styles.resultsPage}>
        <View style={styles.resultsRoot}>
          <Text style={styles.eyebrow}>Site Audit · {host}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.metaLine}>
            {data.businessName} · {data.auditDate}
          </Text>

          <View style={styles.columnsRow}>
            <PillarColumn
              title="Speed"
              grade={data.speedGrade}
              descriptor={speedDescriptor}
              narrative={data.speedNarrative}
              issueKeys={data.speedTopIssues}
              allClearMessage="No major speed issues detected"
              showAllClear={speedShowAllClear}
            />
            <PillarColumn
              title="Security"
              grade={data.securityGrade}
              descriptor={securityDescriptor}
              narrative={data.securityNarrative}
              issueKeys={data.securityFlags}
              allClearMessage="Your site passed our security checks"
              showAllClear={securityShowAllClear}
            />
            <PillarColumn
              title="SEO & AI Visibility"
              grade={data.seoGrade}
              descriptor={seoDescriptor}
              narrative={data.seoNarrative}
              issueKeys={data.seoFailingSignals}
              allClearMessage="No major SEO issues detected"
              showAllClear={seoShowAllClear}
            />
          </View>

          <Text style={styles.resultsFooter}>
            {footer.brandLine} · {footer.hostLine}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
