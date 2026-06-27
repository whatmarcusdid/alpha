import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

export type FixJobReportQAItem = {
  title: string;
  result: 'PASS' | 'FLAG';
  flagNote: string | null;
};

export type FixJobReportLoopSection = {
  loopName: string;
  qaItems: FixJobReportQAItem[];
};

export type FixJobReportData = {
  businessName: string;
  websiteUrl: string;
  displayId: string;
  deliveryDate: string;
  loopSections: FixJobReportLoopSection[];
  closingSummary: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1f2937',
  },
  brand: {
    fontSize: 10,
    color: '#1B4A41',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  meta: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.45,
    color: '#1f2937',
    marginBottom: 6,
  },
  qaItem: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#1f2937',
    marginBottom: 4,
    paddingLeft: 8,
  },
  flagNote: {
    fontSize: 10,
    color: '#92400e',
    marginLeft: 16,
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

type FixJobReportDocumentProps = {
  data: FixJobReportData;
};

export function FixJobReportDocument({ data }: FixJobReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.brand}>TradeSite Genie</Text>
        <Text style={styles.title}>Site Fix Report</Text>
        <Text style={styles.meta}>{data.businessName}</Text>
        <Text style={styles.meta}>{data.websiteUrl}</Text>
        <Text style={styles.meta}>Fix Job ID: {data.displayId}</Text>
        <Text style={styles.meta}>Delivery date: {data.deliveryDate}</Text>

        {data.loopSections.map((section) => (
          <View key={section.loopName} wrap={false}>
            <Text style={styles.sectionHeading}>{section.loopName}</Text>
            <Text style={styles.subHeading}>QA outcomes</Text>
            {section.qaItems.length === 0 ? (
              <Text style={styles.body}>No QA items for this loop.</Text>
            ) : (
              section.qaItems.map((item, index) => (
                <View key={`${section.loopName}-${index}`}>
                  <Text style={styles.qaItem}>
                    • {item.title} — {item.result}
                  </Text>
                  {item.flagNote ? (
                    <Text style={styles.flagNote}>Flag note: {item.flagNote}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ))}

        <Text style={styles.sectionHeading}>Summary</Text>
        <Text style={styles.body}>{data.closingSummary}</Text>

        <Text style={styles.footer} fixed>
          Delivered by TradeSite Genie · my.tradesitegenie.com
        </Text>
      </Page>
    </Document>
  );
}
