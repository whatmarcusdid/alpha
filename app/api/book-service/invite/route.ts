import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { processDashboardInvite } from '@/lib/book-service/dashboard-invite';
import { withAuth } from '@/lib/middleware/apiHandler';

const CRON_SECRET = process.env.CRON_SECRET;

const inviteSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  orderId: z.string().min(1),
  sku: z.enum(['speed_fix', 'security_fix', 'seo_ai_visibility_fix', 'full_bundle']),
});

function isServerToServerRequest(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    return false;
  }

  return req.headers.get('authorization') === `Bearer ${CRON_SECRET}`;
}

async function handleInviteRequest(
  req: NextRequest,
  authenticatedUserId?: string
): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  if (authenticatedUserId != null && parsed.data.userId !== authenticatedUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await processDashboardInvite(parsed.data);
  return NextResponse.json({ success: true });
}

const authenticatedInvitePost = withAuth(async (req, { userId }) => {
  return handleInviteRequest(req, userId);
});

export async function POST(req: NextRequest) {
  if (isServerToServerRequest(req)) {
    return handleInviteRequest(req);
  }

  return authenticatedInvitePost(req);
}
