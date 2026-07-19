import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import { SECURITY_FLAG_DISPLAY_NAMES } from '@/lib/audit/securityFlagDisplayNames';
import {
  SPEED_ISSUE_DISPLAY_NAMES,
  type SpeedTopIssueKey,
} from '@/lib/audit/speedTopIssues';
import { getAppBaseUrl } from '@/lib/base-url';
import type { ClientGrade, Grade, SecurityFlag, SecurityFlagTier } from '@/lib/types/audit';
import { getResultsHeadline } from '@/lib/types/audit';
import {
  SEO_SIGNAL_DISPLAY_NAMES,
  type SeoFailingSignalKey,
} from '@/lib/types/seoSignals';

export type AuditReportData = {
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

/** Figma Book Service tokens (node 545:4238) */
const COLORS = {
  secondary: '#2920a5',
  darkBg: '#0c0a28',
  dark: '#030712',
  tertiary: '#52525b',
  light: '#ffffff',
  neutral200: '#e5e7eb',
  critical: '#e7000b',
  warning: '#f0b100',
  success: '#00A63E',
  primary: '#34d399',
  na: '#6b7280',
} as const;

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return COLORS.success;
    case 'B':
      return '#65a30d';
    case 'C':
      return COLORS.warning;
    case 'D':
    case 'F':
      return COLORS.critical;
    case 'N/A':
    default:
      return COLORS.na;
  }
}

function displayHost(websiteUrl: string): string {
  return websiteUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function headlineFirstName(businessName: string): string {
  const trimmed = businessName.trim();
  if (!trimmed) return 'Your';
  return trimmed.split(/\s+/)[0]?.replace(/[,.'"]+$/, '') || 'Your';
}

function speedDescriptor(data: AuditReportData): string {
  if (data.speedGrade === 'N/A') return 'Score unavailable';
  return `Score: ${data.speedScore}/100`;
}

function securityDescriptor(data: AuditReportData): string {
  if (data.securityGrade === 'N/A') return 'Scan unavailable';
  if (data.securityGrade === 'F') return 'Site is flagged as unsafe';
  if (data.securityFlags.length === 0) return '0 flags found';
  return `${data.securityFlags.length} flag${data.securityFlags.length === 1 ? '' : 's'} found`;
}

function seoDescriptor(data: AuditReportData): string {
  if (data.seoGrade === 'N/A') return 'Score unavailable';
  return `Score: ${data.seoScore}/9`;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: COLORS.dark,
    flexDirection: 'column',
    backgroundColor: COLORS.light,
  },
  coverFill: {
    flexGrow: 1,
  },
  coverBusiness: {
    fontSize: 23,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.darkBg,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  coverUrl: {
    fontSize: 11,
    color: COLORS.tertiary,
    marginBottom: 24,
    lineHeight: 1.5,
  },
  coverLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    marginBottom: 6,
    lineHeight: 1.5,
  },
  coverDate: {
    fontSize: 11,
    color: COLORS.tertiary,
    lineHeight: 1.5,
  },
  coverFooter: {
    marginTop: 'auto',
    paddingTop: 24,
    fontSize: 10,
    color: COLORS.tertiary,
  },
  headerBlock: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 32,
  },
  logoText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
  },
  siteAuditLine: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    lineHeight: 1.5,
  },
  headline: {
    fontSize: 23,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.darkBg,
    lineHeight: 1.2,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    flexDirection: 'column',
    gap: 20,
  },
  gradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: COLORS.neutral200,
    borderStyle: 'solid',
    borderRadius: 8,
    backgroundColor: COLORS.light,
    width: '100%',
  },
  gradeLetter: {
    width: 45,
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.2,
    textAlign: 'center',
  },
  gradeLetterNa: {
    width: 45,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.2,
    textAlign: 'center',
    color: COLORS.na,
  },
  gradeMeta: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  gradeLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.tertiary,
    lineHeight: 1.5,
  },
  gradeDescriptor: {
    fontSize: 11,
    color: COLORS.tertiary,
    lineHeight: 1.5,
  },
  pillarTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    lineHeight: 1.2,
    marginBottom: 4,
  },
  pillarBody: {
    fontSize: 11,
    color: COLORS.tertiary,
    lineHeight: 1.5,
  },
  issuesBlock: {
    flexDirection: 'column',
    gap: 8,
  },
  issuesHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    lineHeight: 1.5,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  issueText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.dark,
    lineHeight: 1.5,
  },
  allClearText: {
    fontSize: 11,
    color: COLORS.dark,
    lineHeight: 1.5,
  },
  backHeading: {
    fontSize: 23,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.darkBg,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  backBody: {
    fontSize: 11,
    lineHeight: 1.5,
    color: COLORS.tertiary,
    marginBottom: 16,
  },
  ctaLink: {
    fontSize: 11,
    color: COLORS.secondary,
    textDecoration: 'underline',
  },
  backFooter: {
    marginTop: 24,
    fontSize: 10,
    color: COLORS.tertiary,
  },
});

type AuditReportDocumentProps = {
  data: AuditReportData;
};

function GradeCard({
  grade,
  label,
  descriptor,
}: {
  grade: ClientGrade;
  label: string;
  descriptor: string;
}) {
  return (
    <View style={styles.gradeCard}>
      {grade === 'N/A' ? (
        <Text style={styles.gradeLetterNa}>N/A</Text>
      ) : (
        <Text style={[styles.gradeLetter, { color: gradeColor(grade) }]}>
          {grade}
        </Text>
      )}
      <View style={styles.gradeMeta}>
        <Text style={styles.gradeLabel}>{label}</Text>
        <Text style={styles.gradeDescriptor}>{descriptor}</Text>
      </View>
    </View>
  );
}

function IssueDot({ color }: { color: string }) {
  return <View style={[styles.issueDot, { backgroundColor: color }]} />;
}

function IssueList({
  items,
  dotColor,
}: {
  items: string[];
  dotColor: string;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.issuesBlock}>
      <Text style={styles.issuesHeading}>Top issues found</Text>
      {items.map((item, i) => (
        <View key={`issue-${i}`} style={styles.issueRow}>
          <IssueDot color={dotColor} />
          <Text style={styles.issueText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PillarColumn({
  grade,
  label,
  descriptor,
  narrative,
  issues,
  dotColor,
  showIssueBlock,
  allClearMessage,
}: {
  grade: ClientGrade;
  label: string;
  descriptor: string;
  narrative: string;
  issues: string[];
  dotColor: string;
  showIssueBlock: boolean;
  allClearMessage: string;
}) {
  return (
    <View style={styles.column}>
      <GradeCard grade={grade} label={label} descriptor={descriptor} />
      <View>
        <Text style={styles.pillarTitle}>{label}</Text>
        <Text style={styles.pillarBody}>{narrative}</Text>
      </View>
      {showIssueBlock ? (
        issues.length > 0 ? (
          <IssueList items={issues} dotColor={dotColor} />
        ) : (
          <Text style={styles.allClearText}>{allClearMessage}</Text>
        )
      ) : null}
    </View>
  );
}

export function AuditReportDocument({ data }: AuditReportDocumentProps) {
  const isSeoNa = data.seoGrade === 'N/A';
  const siteFixUrl = `${getAppBaseUrl()}/book-service/select`;
  const host = displayHost(data.websiteUrl);

  const gradeSnapshot = {
    speedGrade: data.speedGrade,
    securityGrade: data.securityGrade,
    seoGrade: data.seoGrade,
  };

  const headline = getResultsHeadline(headlineFirstName(data.businessName), gradeSnapshot);

  const speedIssues = data.speedTopIssues.map(
    (issueKey) =>
      SPEED_ISSUE_DISPLAY_NAMES[issueKey as SpeedTopIssueKey] ?? issueKey
  );
  const securityIssues = data.securityFlags.map(
    (flag) => SECURITY_FLAG_DISPLAY_NAMES[flag] ?? flag
  );
  const seoIssues = data.seoFailingSignals.map(
    (signalKey) => SEO_SIGNAL_DISPLAY_NAMES[signalKey]
  );

  const showSpeedIssueBlock = data.speedGrade !== 'N/A';
  const showSecurityIssueBlock = data.securityGrade !== 'N/A';
  const showSeoIssueBlock = !isSeoNa;

  return (
    <Document>
      {/* Cover — business identity + audit date (not in Figma frame; kept for email PDF) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverFill}>
          <Text style={styles.logoText}>Book Service</Text>
          <Text style={styles.coverLabel}>Site Audit • {host}</Text>
          <Text style={styles.coverBusiness}>{data.businessName}</Text>
          <Text style={styles.coverUrl}>{data.websiteUrl}</Text>
          <Text style={styles.coverDate}>{data.auditDate}</Text>
        </View>
        <Text style={styles.coverFooter}>Powered by TradeSiteGenie</Text>
      </Page>

      {/* Main report — Figma 545:4238 single-page three-column layout */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBlock}>
          <Text style={styles.logoText}>Book Service</Text>
          <Text style={styles.siteAuditLine}>Site Audit • {host}</Text>
          <Text style={styles.headline}>{headline}</Text>
        </View>

        <View style={styles.columnsRow}>
          <PillarColumn
            grade={data.speedGrade}
            label="Speed"
            descriptor={speedDescriptor(data)}
            narrative={data.speedNarrative}
            issues={speedIssues}
            dotColor={COLORS.critical}
            showIssueBlock={showSpeedIssueBlock}
            allClearMessage="No major speed issues detected."
          />
          <PillarColumn
            grade={data.securityGrade}
            label="Security"
            descriptor={securityDescriptor(data)}
            narrative={data.securityNarrative}
            issues={securityIssues}
            dotColor={COLORS.warning}
            showIssueBlock={showSecurityIssueBlock}
            allClearMessage="Your site passed our security checks."
          />
          <PillarColumn
            grade={data.seoGrade}
            label="SEO & AI Visibility"
            descriptor={seoDescriptor(data)}
            narrative={
              isSeoNa
                ? data.seoNarrative || 'SEO audit pending.'
                : data.seoNarrative
            }
            issues={seoIssues}
            dotColor={COLORS.critical}
            showIssueBlock={showSeoIssueBlock}
            allClearMessage="No major SEO issues detected."
          />
        </View>
      </Page>

      {/* CTA back page */}
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.backHeading}>
            Don&apos;t leave these issues sitting
          </Text>
          <Text style={styles.backBody}>
            The Book Service Site Fix tackles each of these one by one, in
            priority order.
          </Text>
          <Link src={siteFixUrl} style={styles.ctaLink}>
            View Your Site Fix Options
          </Link>
        </View>
        <Text style={styles.backFooter}>
          TradeSiteGenie · my.tradesitegenie.com
        </Text>
      </Page>
    </Document>
  );
}
