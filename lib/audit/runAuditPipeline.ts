import { crawlPage } from '@/lib/audit/crawlPage';
import { gradeSEO } from '@/lib/audit/gradeSEO';
import { checkHttpsSecurity } from '@/lib/audit/httpsCheck';
import { fetchPageSpeed } from '@/lib/audit/pagespeed';
import { checkSafeBrowsing } from '@/lib/audit/safeBrowsing';
import { extractSpeedTopIssues } from '@/lib/audit/speedTopIssues';
import { checkSucuri } from '@/lib/audit/sucuri';
import { gradeSecurity, gradeSpeed } from '@/lib/grading';
import type { SecurityFlag } from '@/lib/types/audit';
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';

export type PillarSelection = {
  speed: boolean;
  security: boolean;
  seo: boolean;
};

export type PillarResult<T> = {
  status: 'completed' | 'failed';
  data?: T;
  error?: string;
};

export type PipelineResult = {
  speed?: PillarResult<{
    grade: string;
    score: number;
    topIssues: string[];
  }>;
  security?: PillarResult<{
    grade: string;
    flags: string[];
    flagTier: string;
  }>;
  seo?: PillarResult<{
    grade: string;
    score: number;
    failingSignals: string[];
  }>;
};

function buildSecurityFlags(params: {
  safeBrowsingFlagged: boolean;
  sucuriFlagged: boolean;
  missingHeadersCount: number;
  outdatedCms: boolean;
}): SecurityFlag[] {
  const flags: SecurityFlag[] = [];
  if (params.safeBrowsingFlagged) {
    flags.push('malware_detected');
  }
  if (params.sucuriFlagged) {
    flags.push('blacklisted');
  }
  if (params.outdatedCms) {
    flags.push('outdated_cms');
  }
  if (params.missingHeadersCount > 0) {
    flags.push('missing_security_headers');
  }
  return flags;
}

export async function runAuditPipeline(
  websiteUrl: string,
  pillars: PillarSelection
): Promise<PipelineResult> {
  const result: PipelineResult = {};

  if (pillars.speed) {
    try {
      const pageSpeed = await fetchPageSpeed(websiteUrl);
      if (!pageSpeed.success) {
        throw new Error(pageSpeed.error);
      }

      const speedResult = gradeSpeed(pageSpeed.data);
      result.speed = {
        status: 'completed',
        data: {
          grade: speedResult.letterGrade,
          score: speedResult.performanceScore,
          topIssues: extractSpeedTopIssues(pageSpeed.audits),
        },
      };
    } catch (err) {
      console.error('[runAuditPipeline] Speed pillar failed:', err);
      result.speed = {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (pillars.security) {
    try {
      const [safeBrowsingRaw, sucuriRaw, httpsFlags] = await Promise.all([
        checkSafeBrowsing(websiteUrl),
        checkSucuri(websiteUrl),
        checkHttpsSecurity(websiteUrl),
      ]);

      const safeBrowsingFlagged = safeBrowsingRaw.success
        ? safeBrowsingRaw.flagged
        : false;
      const sucuriFlagged = sucuriRaw.success ? sucuriRaw.flagged : false;
      const missingHeadersCount = sucuriRaw.success
        ? sucuriRaw.missingHeadersCount
        : 0;
      const outdatedCms = sucuriRaw.success ? sucuriRaw.outdatedCms : false;

      const scanFlags = buildSecurityFlags({
        safeBrowsingFlagged,
        sucuriFlagged,
        missingHeadersCount,
        outdatedCms,
      });

      const securityFlags: SecurityFlag[] = [...scanFlags, ...httpsFlags];
      const securityResult = gradeSecurity(securityFlags);

      result.security = {
        status: 'completed',
        data: {
          grade: securityResult.grade,
          flags: securityFlags,
          flagTier: securityResult.flagTier,
        },
      };
    } catch (err) {
      console.error('[runAuditPipeline] Security pillar failed:', err);
      result.security = {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (pillars.seo) {
    try {
      const html = await crawlPage(websiteUrl);
      const {
        seoGrade,
        seoScore,
        seoFailingSignals,
      } = gradeSEO(html);

      result.seo = {
        status: 'completed',
        data: {
          grade: seoGrade,
          score: seoScore,
          failingSignals: seoFailingSignals as SeoFailingSignalKey[],
        },
      };
    } catch (err) {
      console.error('[runAuditPipeline] SEO pillar failed:', err);
      result.seo = {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return result;
}
