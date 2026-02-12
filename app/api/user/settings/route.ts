import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const DEFAULT_SETTINGS = {
  timezone: 'America/New_York',
  timezoneLabel: 'Eastern Standard Time (EST)',
  emailFrequency: 'real-time' as const,
};

const TIMEZONE_LABEL_MAP: Record<string, string> = {
  'Eastern Standard Time (EST)': 'America/New_York',
  'Central Standard Time (CST)': 'America/Chicago',
  'Mountain Standard Time (MST)': 'America/Denver',
  'Pacific Standard Time (PST)': 'America/Los_Angeles',
  'Alaska Standard Time (AKST)': 'America/Anchorage',
  'Hawaii-Aleutian Standard Time (HAST)': 'Pacific/Honolulu',
};

const ALLOWED_EMAIL_FREQUENCIES = ['real-time', 'daily', 'weekly', 'critical'] as const;

export const GET = withAuthAndRateLimit(
  async (req, { userId }) => {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error - Database unavailable' },
        { status: 500 }
      );
    }

    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return NextResponse.json(DEFAULT_SETTINGS);
      }

      const data = userDoc.data();
      const settings = data?.settings || {};
      const wordpressCredentials = data?.wordpressCredentials;

      const response = {
        timezone: settings.timezone ?? DEFAULT_SETTINGS.timezone,
        timezoneLabel: settings.timezoneLabel ?? DEFAULT_SETTINGS.timezoneLabel,
        emailFrequency: settings.emailFrequency ?? DEFAULT_SETTINGS.emailFrequency,
        wordpressDashboardUrl: wordpressCredentials?.dashboardUrl ?? null,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user settings' },
        { status: 500 }
      );
    }
  },
  generalLimiter
);

export const PATCH = withAuthAndRateLimit(
  async (req, { userId }) => {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error - Database unavailable' },
        { status: 500 }
      );
    }

    try {
      const body = await req.json().catch(() => ({}));

      if (typeof body !== 'object' || body === null) {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }

      const { timezoneLabel, emailFrequency } = body;

      const updateData: Record<string, unknown> = {
        'settings.lastUpdated': FieldValue.serverTimestamp(),
      };

      if (timezoneLabel !== undefined) {
        if (typeof timezoneLabel !== 'string') {
          return NextResponse.json(
            { error: 'timezoneLabel must be a string' },
            { status: 400 }
          );
        }

        const timezone = TIMEZONE_LABEL_MAP[timezoneLabel];
        if (!timezone) {
          return NextResponse.json(
            {
              error: 'Invalid timezoneLabel',
              allowedValues: Object.keys(TIMEZONE_LABEL_MAP),
            },
            { status: 400 }
          );
        }

        updateData['settings.timezone'] = timezone;
        updateData['settings.timezoneLabel'] = timezoneLabel;
      }

      if (emailFrequency !== undefined) {
        if (typeof emailFrequency !== 'string') {
          return NextResponse.json(
            { error: 'emailFrequency must be a string' },
            { status: 400 }
          );
        }

        if (!ALLOWED_EMAIL_FREQUENCIES.includes(emailFrequency as typeof ALLOWED_EMAIL_FREQUENCIES[number])) {
          return NextResponse.json(
            {
              error: 'Invalid emailFrequency',
              allowedValues: [...ALLOWED_EMAIL_FREQUENCIES],
            },
            { status: 400 }
          );
        }

        updateData['settings.emailFrequency'] = emailFrequency;
      }

      if (Object.keys(updateData).length === 1) {
        return NextResponse.json(
          { error: 'No valid fields to update. Provide timezoneLabel and/or emailFrequency.' },
          { status: 400 }
        );
      }

      await adminDb.collection('users').doc(userId).update(updateData);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating user settings:', error);
      return NextResponse.json(
        { error: 'Failed to update user settings' },
        { status: 500 }
      );
    }
  },
  generalLimiter
);
