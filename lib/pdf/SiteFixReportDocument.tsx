import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import type { AuditDiff } from '@/lib/audit/diffAuditSnapshots';
import type { FixPillar } from '@/lib/audit/fixPlaybook';
import { PILLAR_TITLES } from '@/lib/fix-jobs/job-detail-utils';

export type SiteFixReportProps = {
  customerName: string;
  businessName: string;
  siteUrl: string;
  deliveryDate: string;
  packageName: string;
  entitlements: FixPillar[];
  diff: AuditDiff;
  completedSignals: {
    [pillar in FixPillar]?: Array<{
      signalKey: string;
      displayName: string;
      clientSummary: string;
    }>;
  };
  deliveryNote?: string;
  supportEmail: string;
};

const BUSINESS_TRANSLATION: Record<FixPillar, string> = {
  speed:
    'A faster site reduces bounce risk, especially for mobile visitors arriving from search. Pages that load in under 3 seconds convert significantly better than slow ones — your fixes move the site in that direction.',
  security:
    'A clean, secure site protects your reputation and your customers. It also removes the warnings and blocks that were preventing visitors from reaching your business online.',
  seo_ai_visibility:
    'Your site is now clearer to search engines and AI tools about what you do and where you do it. That means more of the right people — local customers searching for your services — can find you.',
};

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
    case 'B':
      return '#16a34a';
    case 'C':
      return '#d97706';
    case 'D':
    case 'F':
      return '#dc2626';
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
  coverBrand: {
    fontSize: 10,
    color: '#1B4A41',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
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
  coverMeta: {
    fontSize: 11,
    color: '#1f2937',
    marginBottom: 4,
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
    marginBottom: 10,
    marginTop: 8,
  },
  subHeading: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.45,
    color: '#1f2937',
    marginBottom: 8,
  },
  resultRow: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gradeBadge: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  gradeArrow: {
    fontSize: 12,
    color: '#6b7280',
    marginHorizontal: 4,
  },
  bullet: {
    fontSize: 11,
    lineHeight: 1.45,
    color: '#1f2937',
    marginBottom: 4,
    paddingLeft: 8,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#9ca3af',
  },
});

function pillarDiff(pillar: FixPillar, diff: AuditDiff) {
  if (pillar === 'speed') {
    return diff.speed;
  }

  if (pillar === 'security') {
    return diff.security;
  }

  return diff.seo;
}

function outcomeLine(pillar: FixPillar, diff: AuditDiff): string {
  const pd = pillarDiff(pillar, diff);
  const name = PILLAR_TITLES[pillar];

  if (!pd || pd.status === 'failed') {
    return 'Post-fix scan could not complete for this pillar.';
  }

  if (pd.improved) {
    return `Your ${name} improved from ${pd.gradeBefore} to ${pd.gradeAfter}.`;
  }

  return `Your ${name} grade held steady at ${pd.gradeAfter}.`;
}

function PageFooter({ supportEmail }: { supportEmail: string }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>Book Service · {supportEmail}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

export function SiteFixReportDocument({ data }: { data: SiteFixReportProps }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.coverFill}>
          <Text style={styles.coverBrand}>TradeSite Genie · Book Service</Text>
          <Text style={styles.coverBusiness}>{data.businessName}</Text>
          <Text style={styles.coverUrl}>{data.siteUrl}</Text>
          <Text style={styles.coverLabel}>Site Fix Report</Text>
          <Text style={styles.coverMeta}>Prepared for {data.customerName}</Text>
          <Text style={styles.coverMeta}>{data.packageName}</Text>
          <Text style={styles.coverMeta}>{data.deliveryDate}</Text>
        </View>
        <Text style={styles.coverFooter}>Powered by TradeSiteGenie</Text>
        <PageFooter supportEmail={data.supportEmail} />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>Results summary</Text>
        {data.entitlements.map((pillar) => {
          const pd = pillarDiff(pillar, data.diff);
          const before = pd?.gradeBefore ?? '—';
          const after =
            pd?.status === 'failed' ? 'N/A' : (pd?.gradeAfter ?? '—');

          return (
            <View key={pillar} style={styles.resultRow}>
              <Text style={styles.subHeading}>{PILLAR_TITLES[pillar]}</Text>
              <View style={styles.gradeRow}>
                <Text
                  style={[
                    styles.gradeBadge,
                    { color: gradeColor(before), backgroundColor: '#f3f4f6' },
                  ]}
                >
                  {before}
                </Text>
                <Text style={styles.gradeArrow}>→</Text>
                <Text
                  style={[
                    styles.gradeBadge,
                    { color: gradeColor(after), backgroundColor: '#f3f4f6' },
                  ]}
                >
                  {after}
                </Text>
              </View>
              <Text style={styles.body}>{outcomeLine(pillar, data.diff)}</Text>
            </View>
          );
        })}
        <PageFooter supportEmail={data.supportEmail} />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>What we did</Text>
        {data.entitlements.map((pillar) => (
          <View key={pillar}>
            <Text style={styles.subHeading}>{PILLAR_TITLES[pillar]}</Text>
            {(data.completedSignals[pillar] ?? []).length === 0 ? (
              <Text style={styles.body}>No completed fixes recorded for this pillar.</Text>
            ) : (
              (data.completedSignals[pillar] ?? []).map((entry) => (
                <Text key={entry.signalKey} style={styles.bullet}>
                  • {entry.clientSummary}
                </Text>
              ))
            )}
          </View>
        ))}
        <PageFooter supportEmail={data.supportEmail} />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>What this means for your business</Text>
        {data.entitlements.map((pillar) => (
          <View key={pillar}>
            <Text style={styles.subHeading}>{PILLAR_TITLES[pillar]}</Text>
            <Text style={styles.body}>{BUSINESS_TRANSLATION[pillar]}</Text>
          </View>
        ))}
        {data.deliveryNote ? (
          <View>
            <Text style={styles.sectionHeading}>What happens next</Text>
            <Text style={styles.body}>{data.deliveryNote}</Text>
          </View>
        ) : null}
        <PageFooter supportEmail={data.supportEmail} />
      </Page>
    </Document>
  );
}

export { BUSINESS_TRANSLATION };
