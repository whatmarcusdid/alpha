import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { adminDb } from '@/lib/firebase/admin';
import { SUPPORT_EMAIL } from '@/lib/config';
import { FieldValue } from 'firebase-admin/firestore';
import { isSlackNotificationsEnabled } from '@/lib/slack-enabled';
import { sendAccountDeletionConfirmationEmail } from '@/lib/loops';

function extractFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || 'there';
}

function buildDeletionSuccessMessage(userEmail: string, confirmationEmailSent: boolean): string {
  if (confirmationEmailSent && userEmail !== 'unknown') {
    return `Your account deletion request has been submitted. We've sent a confirmation email to ${userEmail}. We'll process your request within 48 hours.`;
  }

  return "Your account deletion request has been submitted. We'll process your request within 48 hours.";
}

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error - Database unavailable' },
        { status: 500 }
      );
    }

    try {
      let reason: string | null = null;
      try {
        const body = await req.json().catch(() => ({}));
        if (typeof body === 'object' && body !== null && typeof body.reason === 'string') {
          reason = body.reason;
        }
      } catch {
        // Ignore parse errors, reason stays null
      }

      // Fetch user document
      const userDoc = await adminDb.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const userData = userDoc.data() || {};
      const userEmail = userData.email ?? 'unknown';
      const userName = userData.fullName ?? userData.displayName ?? 'Unknown';
      const reasonText = reason?.trim() || 'No reason provided';
      const submittedAt = new Date().toISOString();
      const ticketId = `DEL-${Date.now()}`;

      // Log deletion request first (so we have a record even if notifications fail)
      await adminDb.collection('deletionRequests').add({
        userId,
        userEmail,
        userName,
        reason: reason || null,
        requestedAt: FieldValue.serverTimestamp(),
        status: 'pending',
      });

      // Send email via Loops API (fire-and-forget, don't block on failure)
      const loopsApiKey = process.env.LOOPS_API_KEY;
      const loopsTemplateId =
        process.env.LOOPS_SUPPORT_TICKET_TEMPLATE_ID || 'support-ticket-to-helpscout';

      if (loopsApiKey) {
        try {
          const loopsRes = await fetch('https://app.loops.so/api/v1/transactional', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${loopsApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionalId: loopsTemplateId,
              email: SUPPORT_EMAIL,
              dataVariables: {
                subject: `Account Deletion Request - ${userName}`,
                customerName: userName,
                customerEmail: userEmail,
                category: 'Account Deletion',
                urgency: 'Medium',
                ticketId,
                submittedAt,
                body: `Customer has requested account deletion.\n\nReason: ${reasonText}\n\nPlease process this request and follow up with the customer.`,
                replyToEmail: userEmail,
              },
            }),
          });

          if (!loopsRes.ok) {
            console.error('Loops API failed:', loopsRes.status, await loopsRes.text());
          }
        } catch (error) {
          console.error('Loops API error:', error);
        }
      } else {
        console.warn('⚠️ LOOPS_API_KEY not configured, skipping email notification');
      }

      let confirmationEmailSent = false;
      if (userEmail !== 'unknown') {
        try {
          const confirmationResult = await sendAccountDeletionConfirmationEmail(userEmail, {
            firstName: extractFirstName(userName),
            submittedAt,
            ticketId,
          });
          confirmationEmailSent = confirmationResult.success;
          if (!confirmationResult.success) {
            console.error(
              '⚠️ [Loops] Account deletion confirmation email failed:',
              confirmationResult.error
            );
          }
        } catch (error) {
          console.error('⚠️ [Loops] Account deletion confirmation email error:', error);
        }
      }

      // Send Slack notification (fire-and-forget)
      const slackWebhookUrl = process.env.SLACK_SUPPORT_WEBHOOK_URL;
      if (isSlackNotificationsEnabled() && slackWebhookUrl) {
        try {
          const slackRes = await fetch(slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🗑️ Account Deletion Request\n*Customer:* ${userName} (${userEmail})\n*Reason:* ${reasonText}\n*Submitted:* ${submittedAt}`,
            }),
          });

          if (!slackRes.ok) {
            console.error('Slack notification failed:', slackRes.status);
          }
        } catch (error) {
          console.error('Slack notification error:', error);
        }
      } else if (isSlackNotificationsEnabled()) {
        console.warn('⚠️ SLACK_SUPPORT_WEBHOOK_URL not configured, skipping Slack notification');
      }

      return NextResponse.json({
        success: true,
        message: buildDeletionSuccessMessage(userEmail, confirmationEmailSent),
      });
    } catch (error) {
      console.error('Error processing account deletion request:', error);
      return NextResponse.json(
        { error: 'Failed to submit account deletion request' },
        { status: 500 }
      );
    }
  },
  generalLimiter
);
