import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

export type AuditReportData = {
  businessName: string;
  websiteUrl: string;
  auditDate: string;
  speedGrade: string;
  speedScore: number;
  speedTopIssues: string[];
  speedNarrative: string;
  securityGrade: string;
  securityFlags: string[];
  securityNarrative: string;
  uxGrade: string;
  uxScore: number;
  uxPillarScores: { understand: number; see: number; know: number };
  uxFailingSignals: string[];
  uxNarrative: string;
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
  planLine: {
    fontSize: 11,
    marginBottom: 6,
    color: '#1f2937',
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
  const { understand, see, know } = data.uxPillarScores;
  const isUxNa = data.uxGrade === 'N/A';

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
          <GradeSummaryBlock grade={data.uxGrade} label="USER EXPERIENCE" />
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

      {/* 5. UX */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>First-Impression UX</Text>
        {isUxNa ? (
          <Text style={styles.body}>{data.uxNarrative}</Text>
        ) : (
          <>
            <Text style={styles.body}>
              {data.uxGrade} — Score: {data.uxScore}/9
            </Text>
            <Text style={styles.body}>
              Understand: {understand}/3 | See: {see}/3 | Know: {know}/3
            </Text>
            <Text style={styles.body}>{data.uxNarrative}</Text>
            {data.uxFailingSignals.length > 0 ? (
              <>
                <Text style={styles.subHeading}>Areas to improve:</Text>
                {data.uxFailingSignals.map((line, i) => (
                  <Text key={`ux-${i}`} style={styles.bullet}>
                    • {line}
                  </Text>
                ))}
              </>
            ) : null}
          </>
        )}
      </Page>

      {/* 6. Back / CTA */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.backHeading}>Ready to fix this?</Text>
        <Text style={styles.backBody}>
          The Genie Site Care Plan handles everything in this report — and keeps
          it fixed month after month.
        </Text>
        <Text style={styles.planLine}>Essential — $489/year</Text>
        <Text style={styles.planLine}>Advanced — $1,389/year</Text>
        <Text style={styles.planLine}>
          Lifetime — $2,489/year (limited to 20 clients)
        </Text>
        <Text style={[styles.backBody, { marginTop: 12 }]}>
          Get started at: {data.pricingUrl}
        </Text>
        <Text style={styles.backFooter}>
          TradeSiteGenie · my.tradesitegenie.com
        </Text>
      </Page>
    </Document>
  );
}
