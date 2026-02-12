/**
 * Dashboard Ready Notification API
 *
 * Sends the "Dashboard Ready" email via Loops after a customer completes signup.
 * Called from SignUpForm after successful account creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendDashboardReadyEmail } from '@/lib/loops';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, firstName, planTier } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log(`[Dashboard Ready] Sending email to: ${email}`);

    const result = await sendDashboardReadyEmail(email, {
      firstName: firstName || 'there',
      planTier: planTier || 'Essential',
    });

    if (result.success) {
      console.log(`✅ [Dashboard Ready] Email sent to: ${email}`);
      return NextResponse.json({ success: true });
    } else {
      console.error(`⚠️ [Dashboard Ready] Failed: ${result.error}`);
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Dashboard Ready] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
