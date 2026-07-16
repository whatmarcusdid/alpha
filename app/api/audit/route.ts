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

import { getAuditNarratives, getSEONarrative } from '@/lib/audit/gemini';
import { applyPipelineToAuditState, deriveAuditStatus } from '@/lib/audit/applyPipelineResult';
import { runAuditPipeline } from '@/lib/audit/runAuditPipeline';
import { checkEmailRateLimit } from '@/lib/audit/rateLimit';
import { adminDb } from '@/lib/firebase/admin';
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
} from '@/lib/types/audit';

const IP_LIMIT_MESSAGE =
  "You've reached today's free audit limit from this network. Try again tomorrow or contact us if you think this is a mistake.";

const EMAIL_LIMIT_MESSAGE =
  "You've already run an audit today. Check your inbox for your previous report, or contact us directly.";

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

    let speedNarrative =
      "We weren't able to check your site speed this time. " +
      'Your Security and SEO & AI Visibility results are still shown below.';

    let securityNarrative =
      "We weren't able to complete your security scan this time. " +
      'Your Speed and SEO & AI Visibility results are still shown below.';

    let seoNarrative =
      "We weren't able to complete your SEO & AI Visibility check this time. " +
      'Your Speed and Security results are still shown below.';

    const pipeline = await runAuditPipeline(input.websiteUrl, {
      speed: true,
      security: true,
      seo: true,
    });

    const pillarState = applyPipelineToAuditState(pipeline);

    let speedGrade = pillarState.speedGrade;
    let speedScore = pillarState.speedScore;
    let speedTopIssues = pillarState.speedTopIssues;
    let speedStatus = pillarState.speedStatus;

    let securityGrade = pillarState.securityGrade;
    let securityFlags = pillarState.securityFlags;
    let securityFlagTier = pillarState.securityFlagTier;
    let securityStatus = pillarState.securityStatus;

    let seoGrade = pillarState.seoGrade;
    let seoScore = pillarState.seoScore;
    let seoFailingSignals = pillarState.seoFailingSignals;
    let seoStatus = pillarState.seoStatus;

    if (speedStatus === 'completed') {
      speedNarrative = `Your site scored ${speedScore}/100 for speed. Grade: ${speedGrade}.`;
    }

    if (securityStatus === 'completed') {
      securityNarrative = `Your site received a Security grade of ${securityGrade}.`;
    }

    if (seoStatus === 'completed') {
      try {
        seoNarrative = await getSEONarrative({
          seoGrade,
          seoScore,
          seoFailingSignals,
          websiteUrl: input.websiteUrl,
        });
      } catch (err) {
        console.error('[audit] SEO narrative generation failed:', err);
      }
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

    const auditStatus = deriveAuditStatus(pillarState);

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
