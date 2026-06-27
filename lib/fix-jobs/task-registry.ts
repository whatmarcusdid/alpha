export type TaskDefinition = {
  id: string;
  label: string;
};

export type PhaseKey = 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4';

export const PHASE_TASKS: Record<PhaseKey, TaskDefinition[]> = {
  phase0: [
    { id: 'p0_t1', label: 'Create backup and lock in access' },
    { id: 'p0_t2', label: 'Record baseline metrics' },
  ],
  phase1: [
    { id: 'p1_t1', label: 'Run Sucuri SiteCheck external scan' },
    { id: 'p1_t2', label: 'Run malware scan via security plugin or host' },
    { id: 'p1_t3', label: 'PHP error display + information exposure' },
    { id: 'p1_t4', label: 'Insecure PHP configuration (expose_php + header leakage)' },
    { id: 'p1_t5', label: 'Overly permissive CSP (unsafe-eval)' },
    { id: 'p1_t6', label: 'Add strict security headers (HSTS, X-Frame, CSP, Referrer)' },
    { id: 'p1_t7', label: 'Core, plugin, and theme cleanup + updates' },
    { id: 'p1_t8', label: 'Malicious file removal + password reset' },
    { id: 'p1_t9', label: 'Configuration hardening + WAF setup' },
    { id: 'p1_t10', label: 'Run fresh scans + submit delisting request' },
  ],
  phase2: [
    { id: 'p2_t1', label: 'Run PageSpeed insights + GTmetrix audit' },
    { id: 'p2_t2', label: 'Speed fixes playbook — apply as needed' },
    { id: 'p2_t3', label: 'Bulk compress all images via ShortPixel' },
    { id: 'p2_t4', label: 'Manually resize + re-upload oversized hero images' },
    { id: 'p2_t5', label: 'Configure WP Rocket — caching, compression, minification' },
    { id: 'p2_t6', label: 'Defer + delay non-critical JavaScript' },
    { id: 'p2_t7', label: 'Unload unused scripts per page (Perfmatters)' },
    { id: 'p2_t8', label: 'Re-run PageSpeed Insights + capture after metrics' },
    { id: 'p2_t9', label: 'Confirm site loads correctly on mobile + desktop' },
  ],
  phase3: [
    { id: 'p3_t1', label: 'Review audit findings + build fix priority list' },
    { id: 'p3_t2', label: 'Rewrite title tags + meta descriptions' },
    { id: 'p3_t3', label: 'Fix H1 and H2 heading structure' },
    { id: 'p3_t4', label: 'Strengthen service, location & FAQ content' },
    { id: 'p3_t5', label: 'Add LocalBusiness, Service, and FAQ schema' },
    { id: 'p3_t6', label: 'Add internal links + update image alt text' },
  ],
  phase4: [
    { id: 'p4_t1', label: 'Compile security before/after summary' },
    { id: 'p4_t2', label: 'Compile speed before/after metrics' },
    { id: 'p4_t3', label: 'Compile SEO before/after summary' },
    { id: 'p4_t4', label: 'Write plain-English client summary + timeline' },
  ],
};

export const PHASE_LABELS: Record<PhaseKey, string> = {
  phase0: 'Phase 0 — Prep & baseline',
  phase1: 'Phase 1 — Security',
  phase2: 'Phase 2 — Speed',
  phase3: 'Phase 3 — SEO & AI Visibility',
  phase4: 'Phase 4 — Handoff & documentation',
};
