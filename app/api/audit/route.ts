/**
 * Genie Site Audit — POST orchestration (PageSpeed, security, UX, Gemini, Firestore).
 *
 * IP limiting uses the same Upstash limiter as `withRateLimit`, but `applyRateLimit`
 * runs after Zod validation so invalid bodies do not consume audit quota (steps 1→2).
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { captureScreenshot } from '@/lib/audit/screenshot';
import { getAuditNarratives, getUXScores } from '@/lib/audit/gemini';
import { fetchPageSpeed } from '@/lib/audit/pagespeed';
import { checkEmailRateLimit } from '@/lib/audit/rateLimit';
import { checkSafeBrowsing } from '@/lib/audit/safeBrowsing';
import { checkSucuri } from '@/lib/audit/sucuri';
import { adminDb } from '@/lib/firebase-admin';
import { gradeSecurity, gradeSpeed, gradeUX } from '@/lib/grading';
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
  type GeminiUXResponse,
  type LetterGrade,
  type UXPillarScores,
} from '@/lib/types/audit';

const IP_LIMIT_MESSAGE =
  "You've reached today's free audit limit from this network. Try again tomorrow or contact us if you think this is a mistake.";

const EMAIL_LIMIT_MESSAGE =
  "You've already run an audit today. Check your inbox for your previous report, or contact us directly.";

const PAGESPEED_HARD_FAILURE =
  'Our audit tool hit a snag while talking to one of our partners. No charges, no changes were made. Please try again in a few minutes or email support.';

const GENERIC_FAILURE = 'Something went wrong. Please try again.';

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

    const [safeBrowsingRaw, sucuriRaw, screenshotRaw] = await Promise.all([
      checkSafeBrowsing(input.websiteUrl),
      checkSucuri(input.websiteUrl),
      captureScreenshot(input.websiteUrl),
    ]);

    const safeBrowsingFlagged = safeBrowsingRaw.success
      ? safeBrowsingRaw.flagged
      : false;

    const sucuriFlagged = sucuriRaw.success ? sucuriRaw.flagged : false;
    const missingHeadersCount = sucuriRaw.success
      ? sucuriRaw.missingHeadersCount
      : 0;
    const outdatedCms = sucuriRaw.success ? sucuriRaw.outdatedCms : false;

    const screenshotBuffer = screenshotRaw.success ? screenshotRaw.buffer : null;

    const pageSpeed = await fetchPageSpeed(input.websiteUrl);
    if (!pageSpeed.success) {
      return NextResponse.json({ error: PAGESPEED_HARD_FAILURE }, { status: 500 });
    }

    const pageSpeedData = pageSpeed.data;

    let uxScoreData: GeminiUXResponse | null = null;
    if (screenshotBuffer !== null) {
      uxScoreData = await getUXScores(screenshotBuffer);
    }

    const speedResult = gradeSpeed(pageSpeedData);
    const securityResult = gradeSecurity({
      safeBrowsingFlagged,
      sucuriFlagged,
      missingHeadersCount,
      outdatedCms,
    });

    let uxGrade: LetterGrade | 'N/A';
    let uxScore: number;
    let uxPillarScores: UXPillarScores;
    let uxFailingSignals: string[];

    if (uxScoreData !== null) {
      const uxResult = gradeUX(uxScoreData);
      uxGrade = uxResult.letterGrade;
      uxScore = uxResult.totalScore;
      uxPillarScores = uxResult.pillarScores;
      uxFailingSignals = uxResult.failingSignals;
    } else {
      uxGrade = 'N/A';
      uxScore = 0;
      uxPillarScores = { understand: 0, see: 0, know: 0 };
      uxFailingSignals = [];
    }

    const narratives = await getAuditNarratives({
      screenshotBuffer: screenshotBuffer ?? Buffer.alloc(0),
      speedGrade: speedResult.letterGrade,
      speedScore: speedResult.performanceScore,
      topIssues: speedResult.topIssues,
      securityGrade: securityResult.letterGrade,
      securityFlags: securityResult.flags,
      uxGrade,
      uxScore,
      uxPillarScores,
      uxFailingSignals,
    });

    if (uxGrade === 'N/A') {
      narratives.ux =
        "We weren't able to capture a screenshot of your site to run The Stranger Test. Your Speed and Security grades are unaffected.";
    }

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
        speedGrade: speedResult.letterGrade,
        speedScore: speedResult.performanceScore,
        speedTopIssues: speedResult.topIssues,
        speedNarrative: narratives.speed,
        securityGrade: securityResult.letterGrade,
        securityFlags: securityResult.flags,
        securityNarrative: narratives.security,
        uxGrade,
        uxScore,
        uxPillarScores,
        uxFailingSignals,
        uxNarrative: narratives.ux,
        pricingUrl:
          process.env.NEXT_PUBLIC_PRICING_URL ??
          'https://tradesitegenie.com/pricing',
      };
      pdfBuffer = await generateAuditPDF(pdfData);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }

    const auditResult: AuditResult = {
      businessName: input.businessName,
      websiteUrl: input.websiteUrl,
      speedGrade: speedResult.letterGrade,
      speedScore: speedResult.performanceScore,
      speedTopIssues: speedResult.topIssues,
      securityGrade: securityResult.letterGrade,
      securityFlags: securityResult.flags,
      uxGrade,
      uxScore,
      uxPillarScores,
      uxFailingSignals,
      aiNarrative: narratives,
    };

    if (!input.isClient) {
      void (async () => {
        try {
          if (adminDb) {
            const auditLeadDoc: AuditLeadDoc = {
              businessName: input.businessName,
              firstName: input.firstName,
              email: input.email,
              websiteUrl: input.websiteUrl,
              speedGrade: speedResult.letterGrade,
              speedScore: speedResult.performanceScore,
              securityGrade: securityResult.letterGrade,
              securityFlags: securityResult.flags,
              uxGrade,
              uxScore,
              uxPillarScores,
              uxFailingSignals,
              aiNarrative: narratives,
              timestamp: Timestamp.now(),
              source: 'public_audit',
            };
            await adminDb.collection('auditLeads').add(auditLeadDoc);
          }

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
            speedGrade: speedResult.letterGrade,
            securityGrade: securityResult.letterGrade,
            uxGrade,
            uxPillarScores,
          });

          await createAuditLeadRecord({
            firstName: input.firstName,
            businessName: input.businessName,
            email: input.email,
            websiteUrl: input.websiteUrl,
            speedGrade: speedResult.letterGrade,
            securityGrade: securityResult.letterGrade,
            uxGrade,
            uxScore,
            uxPillarScores,
            source: 'public_audit',
          });
        } catch (err) {
          console.error('[POST /api/audit] fire-and-forget automation error:', err);
        }
      })();
    }

    return NextResponse.json(
      { success: true, data: auditResult },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/audit]', error);
    return NextResponse.json({ error: GENERIC_FAILURE }, { status: 500 });
  }
}
