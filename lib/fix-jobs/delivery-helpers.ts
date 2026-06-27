import type { FixJobEntitlements } from '@/lib/types/fix-job';

export function buildReportFilename(displayId: string, businessName: string): string {
  const sanitizedName = businessName.replace(/\s+/g, '');
  return `Report_${displayId}_${sanitizedName}.pdf`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const LOOP_EMAIL_BULLETS: Record<'speed' | 'security' | 'seo', string> = {
  security:
    'Security: We renewed your SSL certificate, cleared mixed content errors, installed Wordfence, and added security headers. Your site now passes a clean security scan.',
  speed:
    'Speed: We compressed your images, enabled caching and minification via WP Rocket, and deferred render-blocking scripts.',
  seo: 'SEO & AI Visibility: We rewrote your title tags, fixed heading structure, added schema markup, and strengthened your service and location content.',
};

export function buildDeliveryEmailBody(params: {
  clientFirstName: string;
  purchasedLoopsLabel: string;
  primaryWebsiteUrl: string;
  entitlements: FixJobEntitlements;
  flagNote: string | null;
}): string {
  const bullets: string[] = [];

  if (params.entitlements.security) {
    bullets.push(LOOP_EMAIL_BULLETS.security);
  }
  if (params.entitlements.speed) {
    bullets.push(LOOP_EMAIL_BULLETS.speed);
  }
  if (params.entitlements.seo) {
    bullets.push(LOOP_EMAIL_BULLETS.seo);
  }

  const bulletBlock = bullets.map((line) => `- ${line}`).join('\n');
  const flagBlock = params.flagNote
    ? `\nNote: ${params.flagNote}\n`
    : '\n';

  return `Hi ${params.clientFirstName},

Great news — we've completed the ${params.purchasedLoopsLabel} fix on ${params.primaryWebsiteUrl}.

Here's a quick summary of what we did:
${bulletBlock}
${flagBlock}
Your full before/after report is attached. Feel free to reply with any questions.

Talk soon,
Marcus
Book Service`;
}

export function buildPdfClosingSummary(
  businessName: string,
  entitlements: FixJobEntitlements
): string {
  const parts: string[] = [];

  if (entitlements.speed) parts.push('faster');
  if (entitlements.security) parts.push('more secure');
  if (entitlements.seo) parts.push('better optimized for search visibility');

  const purchased: string[] = [];
  if (entitlements.speed) purchased.push('Speed');
  if (entitlements.security) purchased.push('Security');
  if (entitlements.seo) purchased.push('SEO & AI Visibility');

  const loopsLabel =
    purchased.length > 0 ? purchased.join(' + ') : 'site fix';

  if (parts.length === 0) {
    return `We completed the ${loopsLabel} fix for ${businessName}. All QA checks passed.`;
  }

  if (parts.length === 1) {
    return `We completed the ${loopsLabel} fix for ${businessName}. All QA checks passed. Your site is now ${parts[0]}.`;
  }

  if (parts.length === 2) {
    return `We completed the ${loopsLabel} fix for ${businessName}. All QA checks passed. Your site is now ${parts[0]} and ${parts[1]}.`;
  }

  return `We completed the ${loopsLabel} fix for ${businessName}. All QA checks passed. Your site is now faster, more secure, and better optimized for search visibility.`;
}

export function countDeliverySteps(params: {
  reportStatus: string | null | undefined;
  deliveryStatus: string | null | undefined;
  revokedTypes: Set<string>;
}): number {
  let count = 0;

  if (params.reportStatus === 'generated' || params.reportStatus === 'sent') {
    count += 1;
  }

  if (params.deliveryStatus === 'sent') {
    count += 1;
  }

  if (params.revokedTypes.has('wordpress_admin')) count += 1;
  if (params.revokedTypes.has('cpanel')) count += 1;
  if (params.revokedTypes.has('sftp')) count += 1;

  return count;
}

export function areAllDeliveryStepsComplete(params: {
  reportStatus: string | null | undefined;
  deliveryStatus: string | null | undefined;
  revokedTypes: Set<string>;
}): boolean {
  return countDeliverySteps(params) === 5;
}
