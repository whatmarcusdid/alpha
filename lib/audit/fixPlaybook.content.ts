// fixPlaybook.content.ts — FINISHED CONTENT HANDOFF (authored by Marcus + Claude from the
// "Book Service Site Fix SOP — Speed + Security + SEO & AI Visibility Fix").
//
// RULES FOR CURSOR:
// - Transcribe verbatim into FIX_PLAYBOOK. Do NOT author/alter steps.
// - Types, pillar assignment, and severity are FROZEN from MVP-01. Values below match MVP-01's
//   severity rules; if any severity here conflicts with the frozen entry, KEEP the frozen value
//   and flag it in the PR description (do not silently change).
// - `tools` on steps are admin-facing and MAY name tools. `clientSummaryTemplate` must NOT contain
//   any denylisted tool name (WP Rocket, Perfmatters, ShortPixel, Sucuri, MalCare, Yoast, Rank
//   Math, AIOSEO, Asset CleanUp, GTmetrix, Query Monitor).

// ── Phase 0 — job-level precondition (render ONCE per job, NOT per signal) ──────────────
export const PHASE_0_PRECONDITIONS = [
  { id: "phase0_access", instruction: "Confirm WordPress admin access and hosting/control-panel access (cPanel, Plesk, or host dashboard) before any work begins.", accessNeeded: "hosting_panel" },
  { id: "phase0_backup", instruction: "Create a full file + database backup via the host or a backup plugin and verify the restore point works.", accessNeeded: "hosting_panel" },
  { id: "phase0_backup_note", instruction: "Log \"Backup created – safe restore point established\" in the client tracker.", accessNeeded: "none" },
  { id: "phase0_baseline_speed", instruction: "Run PageSpeed Insights on the homepage and top service page; record mobile/desktop scores, LCP, and total page weight.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
  { id: "phase0_baseline_security", instruction: "Capture screenshots of Google Safe Browsing/browser warnings and blacklist status as the security baseline.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck"] },
];

// ── SECURITY (10 signals) — SOP Phase 1. Pillar total ≈ 300 min. ────────────────────────
export const SECURITY_CONTENT = {
  malware_detected: {
    sopReference: "SOP Phase 1 §1–§3 — Scan, cleanup & hardening, post-cleanup scans",
    estimatedMinutes: 90,
    steps: [
      { id: "malware_detected_1", instruction: "Run Sucuri SiteCheck (external scan) plus a server/plugin malware scan; save both reports.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck", "security plugin"] },
      { id: "malware_detected_2", instruction: "Document the infection type (injected scripts, spam, redirects) and its locations (files, database, themes/plugins) in the client tracker.", accessNeeded: "wp_admin" },
      { id: "malware_detected_3", instruction: "If the site is clearly hacked, run Sucuri Emergency Cleanup; otherwise remove/clean infected files per the report and replace modified core files with clean copies from official WordPress.", accessNeeded: "sftp", tools: ["Sucuri Emergency Cleanup"] },
      { id: "malware_detected_4", instruction: "Remove suspicious admin users, reset passwords for admin/FTP/database, and regenerate wp-config salts/keys.", accessNeeded: "sftp" },
      { id: "malware_detected_5", instruction: "Re-run Sucuri SiteCheck and the security-plugin scan and confirm both return clean.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck", "security plugin"] },
    ],
    verification: "Fresh Sucuri SiteCheck + security-plugin scan both return clean (no malware/injected scripts) and infected files are absent on a re-crawl.",
    clientSummaryTemplate: "We found and removed the malicious code on your site, replaced any tampered files with clean versions, and confirmed it's clean with fresh scans.",
  },
  blacklisted: {
    sopReference: "SOP Phase 1 §3 — Post-cleanup scans & delisting",
    estimatedMinutes: 30,
    steps: [
      { id: "blacklisted_1", instruction: "Confirm the site is clean via a fresh Sucuri SiteCheck + security-plugin scan before requesting any delisting.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck"] },
      { id: "blacklisted_2", instruction: "Identify every blacklist flagging the site (Google Safe Browsing plus any others surfaced in the scan).", accessNeeded: "external_tool" },
      { id: "blacklisted_3", instruction: "In Google Search Console, open Security Issues / Manual Actions and request a review, briefly describing what was found and what was fixed.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
      { id: "blacklisted_4", instruction: "Submit removal/review requests to any other blacklists that flagged the site.", accessNeeded: "external_tool" },
      { id: "blacklisted_5", instruction: "Log in the client tracker that blacklist delisting typically takes 1–3 days and set a reminder to verify clearance once Google Search Console confirms the review is complete.", accessNeeded: "none" },
    ],
    verification: "Clean scans confirmed and a Google Search Console review request submitted; blacklist status monitored until warnings clear (allow a few days).",
    clientSummaryTemplate: "After cleaning your site, we asked Google and the other warning services to re-check it and remove the warnings — this can take a few days to fully clear.",
  },
  phishing_detected: {
    sopReference: "SOP Phase 1 §1–§3 — Scan, cleanup, delisting",
    estimatedMinutes: 30,
    steps: [
      { id: "phishing_detected_1", instruction: "Run Sucuri SiteCheck + a malware scan; locate the phishing pages and any injected redirects and document them.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck"] },
      { id: "phishing_detected_2", instruction: "Remove the phishing files/pages and injected redirects, and replace any modified core files with clean official copies.", accessNeeded: "sftp" },
      { id: "phishing_detected_3", instruction: "Reset all admin/FTP/database passwords and regenerate wp-config salts/keys.", accessNeeded: "sftp" },
      { id: "phishing_detected_4", instruction: "Re-scan to confirm the phishing content is gone.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck"] },
      { id: "phishing_detected_5", instruction: "Request a review in Google Search Console (Security Issues), describing the cleanup.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
    ],
    verification: "Phishing pages/redirects removed, a fresh Sucuri SiteCheck is clean, and a Search Console review has been requested.",
    clientSummaryTemplate: "We removed the fake/phishing pages that had been placed on your site, secured your logins, and asked Google to re-review it.",
  },
  unwanted_software_detected: {
    sopReference: "SOP Phase 1 §1–§2 — Scan and cleanup/hardening",
    estimatedMinutes: 30,
    steps: [
      { id: "unwanted_software_detected_1", instruction: "Run Sucuri SiteCheck + a malware scan and identify the unwanted software/scripts and their locations.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck"] },
      { id: "unwanted_software_detected_2", instruction: "Remove the unwanted software, delete unused/abandoned or unrecognized plugins and themes, and clear old backup/zip files from wp-content and the webroot.", accessNeeded: "sftp" },
      { id: "unwanted_software_detected_3", instruction: "Replace any modified core files with clean official versions and reset admin/FTP/database credentials.", accessNeeded: "sftp" },
      { id: "unwanted_software_detected_4", instruction: "Re-run the scans to confirm removal.", accessNeeded: "external_tool", tools: ["Sucuri SiteCheck"] },
      { id: "unwanted_software_detected_5", instruction: "Submit a Google Search Console review if the site had been flagged.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
    ],
    verification: "Unwanted software removed, unrecognized plugins/themes deleted, fresh scans clean, and a Search Console review requested if the site was previously flagged.",
    clientSummaryTemplate: "We removed the unwanted software from your site, cleared out anything suspicious, and confirmed it's clean.",
  },
  no_https: {
    sopReference: "SOP Phase 1 — Security hardening (transport security)",
    estimatedMinutes: 25,
    steps: [
      { id: "no_https_1", instruction: "Confirm hosting/control-panel access and check the current SSL status for the domain.", accessNeeded: "hosting_panel" },
      { id: "no_https_2", instruction: "Issue/install an SSL certificate (host's free Let's Encrypt or AutoSSL) covering the domain and www.", accessNeeded: "hosting_panel" },
      { id: "no_https_3", instruction: "Enable a site-wide force-HTTPS redirect and set the WordPress Address/Site Address to https://.", accessNeeded: "wp_admin" },
      { id: "no_https_4", instruction: "Reload the homepage and a service page over https and confirm a valid padlock with no certificate error.", accessNeeded: "none" },
    ],
    verification: "Homepage and key pages load over HTTPS with a valid padlock, http:// redirects to https://, and SSL Labs / the browser shows no certificate error.",
    clientSummaryTemplate: "We turned on secure HTTPS for your site so visitors see the padlock and their connection is encrypted.",
  },
  invalid_ssl: {
    sopReference: "SOP Phase 1 — Security hardening (transport security)",
    estimatedMinutes: 20,
    steps: [
      { id: "invalid_ssl_1", instruction: "Inspect the certificate in the browser and hosting panel to identify the problem (expired, wrong domain, or incomplete chain).", accessNeeded: "hosting_panel" },
      { id: "invalid_ssl_2", instruction: "Renew or reissue the certificate covering the correct domain and www, and install the full certificate chain.", accessNeeded: "hosting_panel" },
      { id: "invalid_ssl_3", instruction: "Clear any host/CDN SSL cache and re-check.", accessNeeded: "hosting_panel" },
      { id: "invalid_ssl_4", instruction: "Confirm the certificate is valid, current, and covers all hostnames.", accessNeeded: "none" },
    ],
    verification: "Certificate is valid, unexpired, matches the domain (incl. www), and presents a complete chain with no browser warning.",
    clientSummaryTemplate: "We fixed your website's security certificate so browsers no longer warn visitors and the padlock displays correctly.",
  },
  missing_security_headers: {
    sopReference: "SOP Phase 1 playbook §4 (strict headers) + §2.4 (basic CSP)",
    estimatedMinutes: 20,
    steps: [
      { id: "missing_security_headers_1", instruction: "Review current headers on securityheaders.com to see what's missing.", accessNeeded: "external_tool" },
      { id: "missing_security_headers_2", instruction: "Add the standard header set (HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) via host/CDN header tools or server config.", accessNeeded: "hosting_panel" },
      { id: "missing_security_headers_3", instruction: "Add a basic Content-Security-Policy, keeping it permissive at first to avoid breaking scripts, and test in the DevTools Console.", accessNeeded: "wp_admin", tools: ["Solid Security"] },
      { id: "missing_security_headers_4", instruction: "Re-scan on securityheaders.com and confirm grade B or better.", accessNeeded: "external_tool" },
    ],
    verification: "securityheaders.com returns grade B or better with the required headers present, and no console/functionality breakage from the CSP.",
    clientSummaryTemplate: "We added the recommended security headers so your site better protects visitors and passes standard security checks.",
  },
  outdated_cms: {
    sopReference: "SOP Phase 1 §2.1 — Core & plugin cleanup",
    estimatedMinutes: 25,
    steps: [
      { id: "outdated_cms_1", instruction: "Confirm the Phase 0 full file + database backup exists before updating anything.", accessNeeded: "hosting_panel" },
      { id: "outdated_cms_2", instruction: "Update WordPress core to the latest stable version.", accessNeeded: "wp_admin" },
      { id: "outdated_cms_3", instruction: "Update all themes and plugins from legitimate sources and remove any unused or abandoned ones.", accessNeeded: "wp_admin" },
      { id: "outdated_cms_4", instruction: "Load the homepage, a service page, and the contact/booking form to confirm nothing broke after the updates.", accessNeeded: "none" },
    ],
    verification: "WordPress core, themes, and plugins are on their latest stable versions with no update-related breakage on key pages/forms, and the version is no longer flagged.",
    clientSummaryTemplate: "We updated your website's core software and plugins to current, supported versions to close known security gaps.",
  },
  http_redirect_missing: {
    sopReference: "SOP Phase 1 — Security hardening (transport security)",
    estimatedMinutes: 10,
    steps: [
      { id: "http_redirect_missing_1", instruction: "Confirm SSL is installed and valid as a prerequisite.", accessNeeded: "hosting_panel" },
      { id: "http_redirect_missing_2", instruction: "Add a permanent (301) redirect from http:// to https:// at the host/server level or via .htaccess.", accessNeeded: "hosting_panel" },
      { id: "http_redirect_missing_3", instruction: "Update the WordPress Address/Site Address and any hardcoded http:// links in settings to https://.", accessNeeded: "wp_admin" },
      { id: "http_redirect_missing_4", instruction: "Request http://domain and http://www.domain and confirm both 301-redirect to the https version with no loop.", accessNeeded: "none" },
    ],
    verification: "http:// and http://www requests both 301-redirect to the canonical https:// URL with no redirect loop.",
    clientSummaryTemplate: "We made sure anyone visiting the non-secure version of your site is automatically sent to the secure one.",
  },
  mixed_content: {
    sopReference: "SOP Phase 1 — Security hardening (transport security)",
    estimatedMinutes: 20,
    steps: [
      { id: "mixed_content_1", instruction: "Scan the site (DevTools Console / crawl) to list assets still loading over http://.", accessNeeded: "external_tool" },
      { id: "mixed_content_2", instruction: "Update hardcoded http:// references for images, scripts, and styles to https:// (a safe database search-replace where needed).", accessNeeded: "sftp" },
      { id: "mixed_content_3", instruction: "Re-point or replace any third-party embeds that only serve http://.", accessNeeded: "wp_admin" },
      { id: "mixed_content_4", instruction: "Reload key pages and confirm the padlock shows with zero mixed-content warnings in the console.", accessNeeded: "none" },
    ],
    verification: "No mixed-content warnings in the browser console on key pages, the padlock displays cleanly, and all assets load over https://.",
    clientSummaryTemplate: "We fixed the insecure images and scripts on your pages so the whole site loads securely with no browser warnings.",
  },
};

// ── SPEED (8 signals) — SOP Phase 2. Pillar total ≈ 210 min. ────────────────────────────
export const SPEED_CONTENT = {
  oversized_images: {
    sopReference: "SOP Phase 2 §2 — Image optimization",
    estimatedMinutes: 45,
    steps: [
      { id: "oversized_images_1", instruction: "In PageSpeed Insights/GTmetrix, list the heaviest images on the homepage and top service page.", accessNeeded: "external_tool", tools: ["PageSpeed Insights", "GTmetrix"] },
      { id: "oversized_images_2", instruction: "Install and configure an image optimizer and run bulk compression (lossy/glossy) with WebP generation where supported, keeping optimizer backups.", accessNeeded: "wp_admin", tools: ["ShortPixel"] },
      { id: "oversized_images_3", instruction: "Manually resize any hero/featured images still larger than their display dimensions and re-upload them.", accessNeeded: "wp_admin" },
      { id: "oversized_images_4", instruction: "Confirm the theme/page builder outputs responsive srcset where possible.", accessNeeded: "wp_admin" },
      { id: "oversized_images_5", instruction: "Re-run PageSpeed and confirm image weight dropped and the oversized-image audit no longer flags.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "Re-run PageSpeed Insights: the 'properly size / efficiently encode images' audits pass, oversized_images no longer appears in top issues, and homepage image weight is materially reduced.",
    clientSummaryTemplate: "We compressed and resized your largest images so your pages load faster without looking worse.",
  },
  render_blocking_resources: {
    sopReference: "SOP Phase 2 §3 — Caching, minification & JS optimization",
    estimatedMinutes: 35,
    steps: [
      { id: "render_blocking_resources_1", instruction: "Identify render-blocking JS/CSS in PageSpeed Insights.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
      { id: "render_blocking_resources_2", instruction: "Enable defer for non-critical JavaScript via the caching/optimization plugin.", accessNeeded: "wp_admin", tools: ["WP Rocket"] },
      { id: "render_blocking_resources_3", instruction: "Delay execution of non-essential scripts (tracking, chat, popups) until user interaction or after paint.", accessNeeded: "wp_admin", tools: ["WP Rocket", "Perfmatters"] },
      { id: "render_blocking_resources_4", instruction: "Exclude any critical scripts that break when deferred, then retest.", accessNeeded: "wp_admin" },
      { id: "render_blocking_resources_5", instruction: "Re-run PageSpeed and confirm render-blocking resources are reduced and LCP improved.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "PageSpeed 'eliminate render-blocking resources' audit passes or materially improves, LCP is lower than baseline, and interactivity is unbroken after defer/delay.",
    clientSummaryTemplate: "We stopped scripts from blocking your page while it loads, so visitors see your content sooner.",
  },
  unused_css_js: {
    sopReference: "SOP Phase 2 playbook §2 + §3.3 — Asset unloading",
    estimatedMinutes: 25,
    steps: [
      { id: "unused_css_js_1", instruction: "Use PageSpeed coverage / GTmetrix to find pages loading unused CSS/JS.", accessNeeded: "external_tool", tools: ["PageSpeed Insights", "GTmetrix"] },
      { id: "unused_css_js_2", instruction: "Unload plugin scripts/styles on pages that don't use them (e.g., slider/form assets), starting with the homepage and primary service pages.", accessNeeded: "wp_admin", tools: ["Asset CleanUp Pro", "Perfmatters"] },
      { id: "unused_css_js_3", instruction: "Enable 'remove unused CSS' in the optimization plugin where safe.", accessNeeded: "wp_admin", tools: ["WP Rocket"] },
      { id: "unused_css_js_4", instruction: "Retest each affected page for visual/functional breakage, then re-run PageSpeed.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "PageSpeed 'reduce unused CSS/JavaScript' audits improve, homepage/service-page request count and transfer size drop, and there is no visual or functional breakage.",
    clientSummaryTemplate: "We removed extra code that pages didn't actually need, trimming what visitors have to download.",
  },
  unminified_css_js: {
    sopReference: "SOP Phase 2 §3.1 — Minification",
    estimatedMinutes: 15,
    steps: [
      { id: "unminified_css_js_1", instruction: "Confirm the issue in PageSpeed ('minify CSS/JavaScript').", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
      { id: "unminified_css_js_2", instruction: "Enable CSS and JS minification in the caching/optimization plugin.", accessNeeded: "wp_admin", tools: ["WP Rocket"] },
      { id: "unminified_css_js_3", instruction: "Enable safe file combination where it helps, testing for breakage.", accessNeeded: "wp_admin", tools: ["WP Rocket"] },
      { id: "unminified_css_js_4", instruction: "Re-run PageSpeed and confirm the minify audits pass.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "PageSpeed 'minify CSS' and 'minify JavaScript' audits pass with no layout/script breakage on key pages.",
    clientSummaryTemplate: "We compacted your site's code files so they download and run faster.",
  },
  missing_compression: {
    sopReference: "SOP Phase 2 §3.1 — GZIP/Brotli compression",
    estimatedMinutes: 15,
    steps: [
      { id: "missing_compression_1", instruction: "Check response headers / PageSpeed for text compression ('enable text compression').", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
      { id: "missing_compression_2", instruction: "Enable GZIP or Brotli compression at the server/host or via the caching plugin.", accessNeeded: "hosting_panel", tools: ["WP Rocket"] },
      { id: "missing_compression_3", instruction: "Confirm compression is active on HTML/CSS/JS responses.", accessNeeded: "external_tool" },
      { id: "missing_compression_4", instruction: "Re-run PageSpeed and confirm the text-compression audit passes.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "Response headers show gzip/br content-encoding on text assets and PageSpeed 'enable text compression' audit passes.",
    clientSummaryTemplate: "We turned on file compression so your pages transfer in a fraction of the size.",
  },
  no_cache_headers: {
    sopReference: "SOP Phase 2 §3.1 — Page/browser caching",
    estimatedMinutes: 15,
    steps: [
      { id: "no_cache_headers_1", instruction: "Review caching in PageSpeed ('serve static assets with an efficient cache policy').", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
      { id: "no_cache_headers_2", instruction: "Enable page caching and browser caching in the caching plugin.", accessNeeded: "wp_admin", tools: ["WP Rocket"] },
      { id: "no_cache_headers_3", instruction: "Set appropriate cache lifetimes for static assets at the host/CDN where available.", accessNeeded: "hosting_panel" },
      { id: "no_cache_headers_4", instruction: "Re-run PageSpeed and confirm the cache-policy audit improves and repeat visits are faster.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "PageSpeed 'efficient cache policy' audit improves, static assets return cache-control/expires headers, and repeat-load time drops.",
    clientSummaryTemplate: "We set up caching so returning visitors load your site much faster.",
  },
  heavy_third_party_scripts: {
    sopReference: "SOP Phase 2 playbook §3 — External calls & embeds",
    estimatedMinutes: 30,
    steps: [
      { id: "heavy_third_party_scripts_1", instruction: "Use the GTmetrix waterfall (and Query Monitor temporarily) to identify the heaviest third-party scripts/embeds.", accessNeeded: "external_tool", tools: ["GTmetrix", "Query Monitor"] },
      { id: "heavy_third_party_scripts_2", instruction: "Consolidate tracking through a single tag manager and remove duplicate/legacy tags.", accessNeeded: "wp_admin", tools: ["Google Tag Manager", "GTM4WP"] },
      { id: "heavy_third_party_scripts_3", instruction: "Delay non-essential third-party scripts (chat, popups, feeds) until interaction and replace live widgets with cached/static versions where possible.", accessNeeded: "wp_admin", tools: ["WP Rocket", "Perfmatters"] },
      { id: "heavy_third_party_scripts_4", instruction: "Disable unnecessary feeds/embeds, then re-run PageSpeed/GTmetrix.", accessNeeded: "wp_admin", tools: ["Disable Feeds"] },
    ],
    verification: "Third-party transfer size and main-thread blocking time drop in GTmetrix/PageSpeed, key pages still function, and duplicate tags are removed.",
    clientSummaryTemplate: "We reduced the slowdown from outside scripts like chat, tracking, and social feeds.",
  },
  slow_server_response: {
    sopReference: "SOP Phase 2 playbook §4 + §3 — Bloat reduction & caching (TTFB)",
    estimatedMinutes: 30,
    steps: [
      { id: "slow_server_response_1", instruction: "Measure server response / TTFB in PageSpeed ('reduce initial server response time') and confirm it's server-side, not front-end.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
      { id: "slow_server_response_2", instruction: "Enable page caching so most requests are served as static HTML.", accessNeeded: "wp_admin", tools: ["WP Rocket"] },
      { id: "slow_server_response_3", instruction: "Remove redundant/dead plugins (keep one 'winner' per category) and measure per-plugin DB/HTTP impact.", accessNeeded: "wp_admin", tools: ["Query Monitor", "Health Check & Troubleshooting"] },
      { id: "slow_server_response_4", instruction: "Confirm hosting resources/PHP version are adequate and enable server-level caching/CDN where available.", accessNeeded: "hosting_panel" },
      { id: "slow_server_response_5", instruction: "Re-run PageSpeed and confirm TTFB improved versus baseline.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "PageSpeed 'reduce initial server response time' (TTFB) audit improves versus baseline and homepage TTFB is measurably lower after caching.",
    clientSummaryTemplate: "We sped up how quickly your server starts delivering pages, cutting the initial wait.",
  },
};
