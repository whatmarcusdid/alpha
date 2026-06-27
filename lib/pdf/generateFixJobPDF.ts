import { renderToBuffer } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';

import {
  FixJobReportDocument,
  type FixJobReportData,
} from './FixJobReportDocument';

export async function generateFixJobPDF(data: FixJobReportData): Promise<Buffer> {
  const element = createElement(FixJobReportDocument, { data });
  return renderToBuffer(element as ReactElement);
}
