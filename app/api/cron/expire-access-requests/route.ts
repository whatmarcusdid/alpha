import { NextRequest, NextResponse } from 'next/server';

import { expireGrantedAccessRequests } from '@/lib/site-access/expire-access-requests';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('[Expire Access Requests] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await expireGrantedAccessRequests();

    return NextResponse.json({
      success: true,
      data: { expired: result.expired },
    });
  } catch (error) {
    console.error('[Expire Access Requests] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
