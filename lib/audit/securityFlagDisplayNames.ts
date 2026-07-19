import type { SecurityFlag } from '@/lib/types/audit';

export const SECURITY_FLAG_DISPLAY_NAMES: Record<SecurityFlag, string> = {
  malware_detected: 'Malware detected on your site',
  blacklisted: 'Site appears on a security blacklist',
  phishing_detected: 'Phishing content detected',
  unwanted_software_detected: 'Unwanted software detected',
  no_https: 'Site is not using HTTPS',
  invalid_ssl: 'SSL certificate is invalid or expired',
  missing_security_headers: 'Missing security headers (X-Frame-Options, CSP)',
  outdated_cms: 'Site running an outdated CMS version',
  http_redirect_missing: 'HTTP to HTTPS redirect is missing',
  mixed_content: 'Mixed HTTP and HTTPS content detected',
};
