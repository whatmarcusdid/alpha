import { renderToBuffer } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';

import {
  SiteFixReportDocument,
  type SiteFixReportProps,
} from './SiteFixReportDocument';

export async function generateSiteFixPDF(
  props: SiteFixReportProps
): Promise<Buffer> {
  const element = createElement(SiteFixReportDocument, { data: props });
  return renderToBuffer(element as ReactElement);
}

export function extractPdfText(buffer: Buffer): string {
  return buffer.toString('latin1');
}
