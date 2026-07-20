import { NextRequest, NextResponse } from 'next/server';

import { sendSiteFixAccessReminders } from '@/lib/book-service/send-access-reminders';
import { devOnlyErrorDetails } from '@/lib/middleware/dev-error-details';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('[Send Access Reminders] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendSiteFixAccessReminders();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Send Access Reminders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send access reminders',
        ...devOnlyErrorDetails(error),
      },
      { status: 500 }
    );
  }
}
