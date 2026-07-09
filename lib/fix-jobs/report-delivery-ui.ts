export function validateLoomUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('loom.com')) {
      return 'Must be a https://loom.com URL';
    }
  } catch {
    return 'Must be a valid URL';
  }

  return null;
}

export function buildDeliveryConfirmMessage(params: {
  recipientEmail: string;
  generatedAtLabel: string;
  loomUrl: string;
}): string {
  const loomLine = params.loomUrl.trim()
    ? params.loomUrl.trim()
    : 'Not included';

  return [
    `Send final delivery to ${params.recipientEmail}?`,
    '',
    `Report: Generated ${params.generatedAtLabel}`,
    `Loom: ${loomLine}`,
    '',
    'This will send the report by email and cannot be undone.',
  ].join('\n');
}
