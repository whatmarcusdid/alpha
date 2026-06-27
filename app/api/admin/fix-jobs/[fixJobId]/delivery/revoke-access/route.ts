import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { revokeCredentialAccess } from '@/lib/fix-jobs/delivery-firestore';
import { withAdmin } from '@/lib/middleware/apiHandler';

const revokeSchema = z.object({
  credentialType: z.enum(['wordpress_admin', 'cpanel', 'sftp']),
});

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = revokeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    const { revokedAt } = await revokeCredentialAccess(
      params.fixJobId,
      parsed.data.credentialType,
      context.userId
    );

    return NextResponse.json({
      success: true,
      revokedAt: revokedAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke access';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
