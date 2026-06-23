import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Grade } from '@/lib/types/audit';
import {
  SEO_SIGNAL_DISPLAY_NAMES,
  type SeoFailingSignalKey,
} from '@/lib/types/seoSignals';

const MODEL = 'gemini-2.5-flash';

const NARRATIVE_TIMEOUT_MS = 15_000;

const SEO_NARRATIVE_FALLBACK =
  "We weren't able to complete your SEO & AI Visibility check " +
  'this time. Your Speed and Security results are still shown below.';

function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.length === 0) {
    return null;
  }
  return new GoogleGenerativeAI(key);
}

export async function getAuditNarratives(params: {
  speedGrade: string;
  speedScore: number;
  topIssues: string[];
  securityGrade: string;
  securityFlags: string[];
}): Promise<{ speed: string; security: string }> {
  const { speedGrade, speedScore, topIssues, securityGrade, securityFlags } =
    params;

  const fallbackSpeed = `Your site scored ${speedScore}/100 for speed. Grade: ${speedGrade}.`;
  const fallbackSecurity = `Your site received a Security grade of ${securityGrade}.`;

  const speedPrompt = `Write 2–3 sentences for a trade business owner (not a developer) explaining their Speed grade of ${speedGrade} (score: ${speedScore}/100). Their top issues are: ${topIssues.join(', ') || 'none'}. Be plain, specific, and actionable. Do not use technical jargon.`;

  const securityPrompt = `Write 2–3 sentences for a trade business owner explaining their Security grade of ${securityGrade}. Issues found: ${securityFlags.join(', ') || 'none — all clear'}. Be plain and reassuring or clear about risk. Do not use technical jargon.`;

  async function narrativeSpeed(): Promise<string> {
    try {
      const genAI = getClient();
      if (!genAI) {
        return fallbackSpeed;
      }
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(speedPrompt, {
        signal: AbortSignal.timeout(NARRATIVE_TIMEOUT_MS),
      });
      const text = result.response.text().trim();
      return text.length > 0 ? text : fallbackSpeed;
    } catch {
      return fallbackSpeed;
    }
  }

  async function narrativeSecurity(): Promise<string> {
    try {
      const genAI = getClient();
      if (!genAI) {
        return fallbackSecurity;
      }
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(securityPrompt, {
        signal: AbortSignal.timeout(NARRATIVE_TIMEOUT_MS),
      });
      const text = result.response.text().trim();
      return text.length > 0 ? text : fallbackSecurity;
    } catch {
      return fallbackSecurity;
    }
  }

  const [speed, security] = await Promise.all([
    narrativeSpeed(),
    narrativeSecurity(),
  ]);

  return { speed, security };
}

export async function getSEONarrative(params: {
  seoGrade: Grade;
  seoScore: number;
  seoFailingSignals: SeoFailingSignalKey[];
  websiteUrl: string;
}): Promise<string> {
  const { seoGrade, seoScore, seoFailingSignals, websiteUrl } = params;

  const signalDescriptions = seoFailingSignals
    .map((key) => SEO_SIGNAL_DISPLAY_NAMES[key])
    .join(', ');

  const prompt = `
You are writing a brief, plain-language explanation of SEO and AI 
visibility findings for a trade or home-service business owner. 
They are not technical. Do not use jargon.

Website: ${websiteUrl}
SEO Grade: ${seoGrade}
Checks passed: ${seoScore} out of 9
Issues found: ${signalDescriptions || 'none'}

Write 2–4 sentences explaining what these results mean for their 
business in plain English. Focus on the impact on their ability to 
get found by customers and AI assistants. Do not list the issues 
again — explain what they mean. Do not use words like "H1", 
"schema markup", "meta description", or other HTML terms. 
Translate everything into business outcomes.
  `.trim();

  try {
    const genAI = getClient();
    if (!genAI) {
      return SEO_NARRATIVE_FALLBACK;
    }
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt, {
      signal: AbortSignal.timeout(NARRATIVE_TIMEOUT_MS),
    });
    const text = result.response.text().trim();
    return text.length > 0 ? text : SEO_NARRATIVE_FALLBACK;
  } catch (err) {
    console.error('[audit] getSEONarrative failed:', err);
    return SEO_NARRATIVE_FALLBACK;
  }
}
