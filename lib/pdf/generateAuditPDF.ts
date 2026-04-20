import { renderToBuffer } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';

import {
  AuditReportDocument,
  type AuditReportData,
} from './AuditReportDocument';

export async function generateAuditPDF(
  data: AuditReportData
): Promise<Buffer> {
  const element = createElement(AuditReportDocument, { data });
  return renderToBuffer(element as ReactElement);
}
