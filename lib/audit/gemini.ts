import { GoogleGenerativeAI } from '@google/generative-ai';

import type { GeminiUXResponse } from '@/lib/types/audit';

const MODEL = 'gemini-2.5-flash';

export const USK_SCORING_PROMPT = `You are evaluating a trade business website screenshot against The Stranger Test framework. Score ONLY what is visible in the screenshot. Do not infer or assume content that is not visible.

Evaluate each of the 9 signals below. Award 1 point if the signal passes, 0 if it fails.

UNDERSTAND pillar (Clarity):
- u1: Is it immediately clear what type of trade service this business provides?
- u2: Is a service area or location mentioned above the fold?
- u3: Is there a primary call-to-action visible above the fold?

SEE pillar (Social Proof / Trust):
- s1: Are customer reviews or testimonials visible or referenced above the fold?
- s2: Is there visual proof of work (photos, before/after images, project photos)?
- s3: Is the business owner or team shown (photo or name)?

KNOW pillar (Conversion / Next Steps):
- k1: Are pricing signals present (ranges, starting at, or transparency language)?
- k2: Is a process or how it works section visible?
- k3: Are there visible friction points that would prevent a visitor from taking action (cluttered nav, buried contact form, no mobile-readable CTA)? Score 0 if friction points exist, 1 if none.

Return ONLY valid JSON in this exact format. No explanation, no markdown:
{
  "understand": <integer 0-3>,
  "see": <integer 0-3>,
  "know": <integer 0-3>,
  "failingSignals": [<array of signal labels that scored 0, e.g. "u2", "s1">]
}`;

const UX_SCORE_TIMEOUT_MS = 15_000;
const NARRATIVE_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGeminiUXResponse(value: unknown): value is GeminiUXResponse {
  if (!isRecord(value)) {
    return false;
  }
  const { understand, see, know, failingSignals } = value;
  if (
    typeof understand !== 'number' ||
    typeof see !== 'number' ||
    typeof know !== 'number' ||
    !Array.isArray(failingSignals)
  ) {
    return false;
  }
  return failingSignals.every((item) => typeof item === 'string');
}

function stripOptionalJsonFence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    const withoutOpening = trimmed.replace(/^```(?:json)?\s*/i, '');
    return withoutOpening.replace(/\s*```\s*$/, '').trim();
  }
  return trimmed;
}

function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.length === 0) {
    return null;
  }
  return new GoogleGenerativeAI(key);
}

export async function getUXScores(
  screenshotBuffer: Buffer
): Promise<GeminiUXResponse | null> {
  try {
    const genAI = getClient();
    if (!genAI) {
      return null;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 300,
      },
    });

    const base64 = screenshotBuffer.toString('base64');

    const result = await model.generateContent(
      {
        contents: [
          {
            role: 'user',
            parts: [
              { text: USK_SCORING_PROMPT },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64,
                },
              },
            ],
          },
        ],
      },
      { signal: AbortSignal.timeout(UX_SCORE_TIMEOUT_MS) }
    );

    const rawText = result.response.text();
    const cleaned = stripOptionalJsonFence(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return null;
    }

    if (!isGeminiUXResponse(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getAuditNarratives(params: {
  screenshotBuffer: Buffer;
  speedGrade: string;
  speedScore: number;
  topIssues: string[];
  securityGrade: string;
  securityFlags: string[];
  uxGrade: string;
  uxScore: number;
  uxPillarScores: { understand: number; see: number; know: number };
  uxFailingSignals: string[];
}): Promise<{ speed: string; security: string; ux: string }> {
  const {
    screenshotBuffer,
    speedGrade,
    speedScore,
    topIssues,
    securityGrade,
    securityFlags,
    uxGrade,
    uxScore,
    uxPillarScores,
    uxFailingSignals,
  } = params;

  const { understand, see, know } = uxPillarScores;

  const fallbackSpeed = `Your site scored ${speedScore}/100 for speed. Grade: ${speedGrade}.`;
  const fallbackSecurity = `Your site received a Security grade of ${securityGrade}.`;
  const fallbackUx = `Your site received a First-Impression UX grade of ${uxGrade} (score: ${uxScore}/9).`;

  const speedPrompt = `Write 2–3 sentences for a trade business owner (not a developer) explaining their Speed grade of ${speedGrade} (score: ${speedScore}/100). Their top issues are: ${topIssues.join(', ') || 'none'}. Be plain, specific, and actionable. Do not use technical jargon.`;

  const securityPrompt = `Write 2–3 sentences for a trade business owner explaining their Security grade of ${securityGrade}. Issues found: ${securityFlags.join(', ') || 'none — all clear'}. Be plain and reassuring or clear about risk. Do not use technical jargon.`;

  const uxPrompt = `Write 2–3 sentences for a trade business owner explaining their First-Impression UX grade of ${uxGrade} (score: ${uxScore}/9). Pillar scores — Understand: ${understand}/3, See: ${see}/3, Know: ${know}/3. Failing signals: ${uxFailingSignals.join(', ') || 'none'}. Reference only what you can see in the screenshot. Be plain and specific.`;

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

  async function narrativeUx(): Promise<string> {
    try {
      const genAI = getClient();
      if (!genAI) {
        return fallbackUx;
      }
      const model = genAI.getGenerativeModel({ model: MODEL });
      const base64 = screenshotBuffer.toString('base64');
      const result = await model.generateContent(
        {
          contents: [
            {
              role: 'user',
              parts: [
                { text: uxPrompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64,
                  },
                },
              ],
            },
          ],
        },
        { signal: AbortSignal.timeout(NARRATIVE_TIMEOUT_MS) }
      );
      const text = result.response.text().trim();
      return text.length > 0 ? text : fallbackUx;
    } catch {
      return fallbackUx;
    }
  }

  const [speed, security, ux] = await Promise.all([
    narrativeSpeed(),
    narrativeSecurity(),
    narrativeUx(),
  ]);

  return { speed, security, ux };
}
