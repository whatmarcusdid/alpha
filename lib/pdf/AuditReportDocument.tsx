import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import { getAppBaseUrl } from '@/lib/base-url';
import type { Grade, SecurityFlag, SecurityFlagTier } from '@/lib/types/audit';
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

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return '#16a34a';
    case 'B':
      return '#65a30d';
    case 'C':
      return '#d97706';
    case 'D':
      return '#ea580c';
    case 'F':
      return '#dc2626';
    case 'N/A':
    default:
      return '#6b7280';
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1f2937',
    flexDirection: 'column',
  },
  coverFill: {
    flexGrow: 1,
  },
  coverBusiness: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  coverUrl: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 24,
  },
  coverLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 11,
    color: '#1f2937',
  },
  coverFooter: {
    marginTop: 'auto',
    paddingTop: 24,
    fontSize: 10,
    color: '#9ca3af',
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginTop: 10,
    marginBottom: 6,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.45,
    color: '#1f2937',
    marginBottom: 8,
  },
  gradeHuge: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  gradeLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    letterSpacing: 1,
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gradeBlock: {
    width: '30%',
    alignItems: 'center',
  },
  bullet: {
    fontSize: 11,
    lineHeight: 1.45,
    color: '#1f2937',
    marginBottom: 4,
    paddingLeft: 8,
  },
  backHeading: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  backBody: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1f2937',
    marginBottom: 16,
  },
  ctaLink: {
    fontSize: 11,
    color: '#1B4A41',
    textDecoration: 'underline',
  },
  backFooter: {
    marginTop: 24,
    fontSize: 10,
    color: '#6b7280',
  },
});

type AuditReportDocumentProps = {
  data: AuditReportData;
};

function GradeSummaryBlock({
  grade,
  label,
}: {
  grade: string;
  label: string;
}) {
  return (
    <View style={styles.gradeBlock}>
      <Text style={[styles.gradeHuge, { color: gradeColor(grade) }]}>
        {grade}
      </Text>
      <Text style={styles.gradeLabel}>{label}</Text>
    </View>
  );
}

export function AuditReportDocument({ data }: AuditReportDocumentProps) {
  const isSeoNa = data.seoGrade === 'N/A';
  const siteFixUrl = `${getAppBaseUrl()}/book-service/select`;

  return (
    <Document>
      {/* 1. Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverFill}>
          <Text style={styles.coverBusiness}>{data.businessName}</Text>
          <Text style={styles.coverUrl}>{data.websiteUrl}</Text>
          <Text style={styles.coverLabel}>Genie Site Audit</Text>
          <Text style={styles.coverDate}>{data.auditDate}</Text>
        </View>
        <Text style={styles.coverFooter}>Powered by TradeSiteGenie</Text>
      </Page>

      {/* 2. Grades summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.resultsTitle}>Your Results</Text>
        <View style={styles.row}>
          <GradeSummaryBlock grade={data.speedGrade} label="SPEED" />
          <GradeSummaryBlock grade={data.securityGrade} label="SECURITY" />
          <GradeSummaryBlock grade={data.seoGrade} label="SEO & AI VISIBILITY" />
        </View>
      </Page>

      {/* 3. Speed */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>Speed</Text>
        <Text style={styles.body}>
          {data.speedGrade} — Score: {data.speedScore}/100
        </Text>
        <Text style={styles.body}>{data.speedNarrative}</Text>
        {data.speedTopIssues.length > 0 ? (
          <>
            <Text style={styles.subHeading}>Top issues found:</Text>
            {data.speedTopIssues.map((line, i) => (
              <Text key={`sp-${i}`} style={styles.bullet}>
                • {line}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.body}>No major speed issues detected.</Text>
        )}
      </Page>

      {/* 4. Security */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>Security</Text>
        <Text style={[styles.body, { fontFamily: 'Helvetica-Bold' }]}>
          {data.securityGrade}
        </Text>
        <Text style={styles.body}>{data.securityNarrative}</Text>
        {data.securityFlags.length > 0 ? (
          <>
            <Text style={styles.subHeading}>Issues found:</Text>
            {data.securityFlags.map((line, i) => (
              <Text key={`sec-${i}`} style={styles.bullet}>
                • {line}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.body}>✓ No security issues detected.</Text>
        )}
      </Page>

      {/* 5. SEO & AI Visibility */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>SEO & AI Visibility</Text>
        {isSeoNa ? (
          <Text style={styles.body}>
            {data.seoNarrative || 'SEO audit pending.'}
          </Text>
        ) : (
          <>
            <Text style={[styles.body, { fontFamily: 'Helvetica-Bold' }]}>
              {data.seoGrade}
            </Text>
            <Text style={styles.body}>
              {data.seoScore}/9 checks passed
            </Text>
            <Text style={styles.body}>{data.seoNarrative}</Text>
            {data.seoFailingSignals.length > 0 ? (
              <>
                <Text style={styles.subHeading}>Areas to improve:</Text>
                {data.seoFailingSignals.map((signalKey, i) => (
                  <Text key={`seo-${i}`} style={styles.bullet}>
                    • {SEO_SIGNAL_DISPLAY_NAMES[signalKey]}
                  </Text>
                ))}
              </>
            ) : (
              <Text style={styles.body}>✓ No major SEO issues detected.</Text>
            )}
          </>
        )}
      </Page>

      {/* 6. Back / CTA */}
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.backHeading}>Don&apos;t leave these issues sitting</Text>
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
