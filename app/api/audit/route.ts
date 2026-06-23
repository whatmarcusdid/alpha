/**
 * Genie Site Audit — POST orchestration (PageSpeed, security, SEO, Gemini, Firestore).
 *
 * IP limiting uses the same Upstash limiter as `withRateLimit`, but `applyRateLimit`
 * runs after Zod validation so invalid bodies do not consume audit quota (steps 1→2).
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

import { randomUUID } from 'crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { crawlPage } from '@/lib/audit/crawlPage';
import { getAuditNarratives, getSEONarrative } from '@/lib/audit/gemini';
import { gradeSEO } from '@/lib/audit/gradeSEO';
import { checkHttpsSecurity } from '@/lib/audit/httpsCheck';
import { fetchPageSpeed } from '@/lib/audit/pagespeed';
import { checkEmailRateLimit } from '@/lib/audit/rateLimit';
import { checkSafeBrowsing } from '@/lib/audit/safeBrowsing';
import { extractSpeedTopIssues } from '@/lib/audit/speedTopIssues';
import { checkSucuri } from '@/lib/audit/sucuri';
import { adminDb } from '@/lib/firebase-admin';
import { gradeSecurity, gradeSpeed } from '@/lib/grading';
import { sendAuditReportEmail } from '@/lib/loops';
import { createAuditLeadRecord } from '@/lib/notion';
import { sendAuditLeadNotification } from '@/lib/slack';
import {
  applyRateLimit,
  auditRateLimiter,
  getClientIdentifier,
  getRateLimitHeaders,
} from '@/lib/middleware/rateLimiting';
import type { AuditReportData } from '@/lib/pdf/AuditReportDocument';
import { generateAuditPDF } from '@/lib/pdf/generateAuditPDF';
import {
  AuditInputSchema,
  type AuditLeadDoc,
  type AuditResult,
  type Grade,
  type SecurityFlag,
  type SecurityFlagTier,
  type SpeedTopIssueKey,
} from '@/lib/types/audit';
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';

const IP_LIMIT_MESSAGE =
  "You've reached today's free audit limit from this network. Try again tomorrow or contact us if you think this is a mistake.";

const EMAIL_LIMIT_MESSAGE =
  "You've already run an audit today. Check your inbox for your previous report, or contact us directly.";

const GENERIC_FAILURE = 'Something went wrong. Please try again.';

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const parsed = AuditInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const input = parsed.data;

    const ipLimit = await applyRateLimit(
      auditRateLimiter,
      getClientIdentifier(req)
    );
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: IP_LIMIT_MESSAGE },
        { status: 429, headers: getRateLimitHeaders(ipLimit) }
      );
    }

    if (!input.isClient) {
      const emailLimited = await checkEmailRateLimit(input.email);
      if (emailLimited) {
        return NextResponse.json({ error: EMAIL_LIMIT_MESSAGE }, { status: 429 });
      }
    }

    let speedGrade: Grade = 'F';
    let speedScore = 0;
    let speedTopIssues: SpeedTopIssueKey[] = [];
    let speedNarrative =
      "We weren't able to check your site speed this time. " +
      'Your Security and SEO & AI Visibility results are still shown below.';
    let speedStatus: 'completed' | 'failed' = 'failed';

    let securityGrade: Grade = 'F';
    let securityFlags: SecurityFlag[] = [];
    let securityFlagTier: SecurityFlagTier = 'none';
    let securityNarrative =
      "We weren't able to complete your security scan this time. " +
      'Your Speed and SEO & AI Visibility results are still shown below.';
    let securityStatus: 'completed' | 'failed' = 'failed';

    let seoGrade: Grade = 'F';
    let seoScore = 0;
    let seoFailingSignals: SeoFailingSignalKey[] = [];
    let seoNarrative =
      "We weren't able to complete your SEO & AI Visibility check this time. " +
      'Your Speed and Security results are still shown below.';
    let seoStatus: 'completed' | 'failed' = 'failed';

    try {
      const pageSpeed = await fetchPageSpeed(input.websiteUrl);
      if (!pageSpeed.success) {
        throw new Error(pageSpeed.error);
      }

      const speedResult = gradeSpeed(pageSpeed.data);
      speedGrade = speedResult.letterGrade;
      speedScore = speedResult.performanceScore;
      speedTopIssues = extractSpeedTopIssues(pageSpeed.audits);
      speedNarrative = `Your site scored ${speedScore}/100 for speed. Grade: ${speedGrade}.`;
      speedStatus = 'completed';
    } catch (err) {
      console.error('[audit] Speed pillar failed:', err);
    }

    try {
      const [safeBrowsingRaw, sucuriRaw, httpsFlags] = await Promise.all([
        checkSafeBrowsing(input.websiteUrl),
        checkSucuri(input.websiteUrl),
        checkHttpsSecurity(input.websiteUrl),
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

      securityFlags = [...scanFlags, ...httpsFlags];
      const securityResult = gradeSecurity(securityFlags);
      securityGrade = securityResult.grade;
      securityFlagTier = securityResult.flagTier;
      securityNarrative = `Your site received a Security grade of ${securityGrade}.`;
      securityStatus = 'completed';
    } catch (err) {
      console.error('[audit] Security pillar failed:', err);
    }

    try {
      const html = await crawlPage(input.websiteUrl);
      const {
        seoGrade: rawSeoGrade,
        seoScore: rawSeoScore,
        seoFailingSignals: rawSignals,
      } = gradeSEO(html);
      const rawNarrative = await getSEONarrative({
        seoGrade: rawSeoGrade,
        seoScore: rawSeoScore,
        seoFailingSignals: rawSignals,
        websiteUrl: input.websiteUrl,
      });

      seoGrade = rawSeoGrade;
      seoScore = rawSeoScore;
      seoFailingSignals = rawSignals;
      seoNarrative = rawNarrative;
      seoStatus = 'completed';
    } catch (err) {
      console.error('[audit] SEO pillar failed:', err);
    }

    if (speedStatus === 'completed' || securityStatus === 'completed') {
      try {
        const narratives = await getAuditNarratives({
          speedGrade,
          speedScore,
          topIssues: speedTopIssues.map(String),
          securityGrade,
          securityFlags,
        });
        if (speedStatus === 'completed') {
          speedNarrative = narratives.speed || speedNarrative;
        }
        if (securityStatus === 'completed') {
          securityNarrative = narratives.security || securityNarrative;
        }
      } catch (err) {
        console.error('[audit] Narrative generation failed:', err);
      }
    }

    const auditStatus =
      [speedStatus, securityStatus, seoStatus].every((s) => s === 'completed')
        ? 'completed'
        : 'partial';

    const auditDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let pdfBuffer: Buffer | null = null;
    try {
      const pdfData: AuditReportData = {
        businessName: input.businessName,
        websiteUrl: input.websiteUrl,
        auditDate,
        speedGrade: speedStatus === 'failed' ? 'N/A' : speedGrade,
        speedScore,
        speedTopIssues,
        speedNarrative,
        securityGrade: securityStatus === 'failed' ? 'N/A' : securityGrade,
        securityFlags,
        securityFlagTier,
        securityNarrative,
        seoGrade: seoStatus === 'failed' ? 'N/A' : seoGrade,
        seoScore,
        seoFailingSignals,
        seoNarrative,
        pricingUrl:
          process.env.NEXT_PUBLIC_PRICING_URL ??
          'https://tradesitegenie.com/pricing',
      };
      pdfBuffer = await generateAuditPDF(pdfData);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }

    let auditLeadId = '';

    if (!input.isClient && adminDb) {
      try {
        const firestorePayload = {
          firstName: input.firstName,
          businessName: input.businessName,
          email: input.email,
          websiteUrl: input.websiteUrl,
          source: 'public_audit' as const,
          schemaVersion: 'v2' as const,
          timestamp: FieldValue.serverTimestamp(),
          auditStatus,
          speedGrade,
          speedScore,
          speedTopIssues,
          speedNarrative,
          speedStatus,
          securityGrade,
          securityFlags,
          securityFlagTier,
          securityNarrative,
          securityStatus,
          seoGrade,
          seoScore,
          seoFailingSignals,
          seoNarrative,
          seoStatus,
        } satisfies Omit<AuditLeadDoc, 'auditLeadId' | 'timestamp'> & {
          timestamp: ReturnType<typeof FieldValue.serverTimestamp>;
        };

        const docRef = await adminDb
          .collection('auditLeads')
          .add(firestorePayload);
        auditLeadId = docRef.id;
        await docRef.update({ auditLeadId });

        void (async () => {
          try {
            if (pdfBuffer) {
              await sendAuditReportEmail({
                email: input.email,
                firstName: input.firstName,
                businessName: input.businessName,
                pdfBuffer,
              });
            }

            await sendAuditLeadNotification({
              firstName: input.firstName,
              businessName: input.businessName,
              email: input.email,
              websiteUrl: input.websiteUrl,
              speedGrade: speedStatus === 'failed' ? 'N/A' : speedGrade,
              securityGrade:
                securityStatus === 'failed' ? 'N/A' : securityGrade,
              seoGrade: seoStatus === 'failed' ? 'N/A' : seoGrade,
              seoScore,
            });

            await createAuditLeadRecord({
              firstName: input.firstName,
              businessName: input.businessName,
              email: input.email,
              websiteUrl: input.websiteUrl,
              speedGrade: speedStatus === 'failed' ? 'N/A' : speedGrade,
              securityGrade:
                securityStatus === 'failed' ? 'N/A' : securityGrade,
              seoGrade: seoStatus === 'failed' ? 'N/A' : seoGrade,
              seoScore,
              source: 'public_audit',
            });
          } catch (err) {
            console.error(
              '[POST /api/audit] fire-and-forget automation error:',
              err
            );
          }
        })();
      } catch (err) {
        console.error('[POST /api/audit] Firestore write failed:', err);
        auditLeadId = randomUUID();
      }
    } else {
      auditLeadId = randomUUID();
    }

    const auditResult: AuditResult = {
      auditLeadId,
      firstName: input.firstName,
      websiteUrl: input.websiteUrl,
      auditStatus,
      speed: {
        grade: speedStatus === 'failed' ? 'N/A' : speedGrade,
        score: speedScore,
        topIssues: speedTopIssues,
        narrative: speedNarrative,
        status: speedStatus,
      },
      security: {
        grade: securityStatus === 'failed' ? 'N/A' : securityGrade,
        flags: securityFlags,
        flagTier: securityFlagTier,
        narrative: securityNarrative,
        status: securityStatus,
      },
      seo: {
        grade: seoStatus === 'failed' ? 'N/A' : seoGrade,
        score: seoScore,
        failingSignals: seoFailingSignals,
        narrative: seoNarrative,
        status: seoStatus,
      },
    };

    return NextResponse.json(
      { success: true, data: auditResult },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/audit]', error);
    return NextResponse.json({ error: GENERIC_FAILURE }, { status: 500 });
  }
}
