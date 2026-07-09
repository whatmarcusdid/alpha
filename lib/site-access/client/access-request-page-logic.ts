export type AccessRequestPageState =
  | 'loading'
  | 'success'
  | 'already_used'
  | 'expired'
  | 'missing_token'
  | 'error';

export type GrantPageSuccess = {
  state: 'success';
  expiresAt: string;
};

export type AccessRequestPageResult =
  | GrantPageSuccess
  | { state: Exclude<AccessRequestPageState, 'success' | 'loading'>; expiresAt?: string };

export function mapAccessRequestErrorMessage(
  status: number,
  errorMessage?: string
): Exclude<AccessRequestPageState, 'success' | 'loading'> {
  if (status === 400 && errorMessage === 'This access link has expired') {
    return 'expired';
  }

  if (
    status === 400 &&
    (errorMessage === 'Invalid or expired access link' ||
      errorMessage === 'This access link has already been used')
  ) {
    return 'already_used';
  }

  return 'error';
}

export async function submitAccessGrant(token: string): Promise<AccessRequestPageResult> {
  const response = await fetch('/api/site-access/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.ok && payload.success && payload.data?.expiresAt) {
    return {
      state: 'success',
      expiresAt: payload.data.expiresAt as string,
    };
  }

  return {
    state: mapAccessRequestErrorMessage(
      response.status,
      typeof payload.error === 'string' ? payload.error : undefined
    ),
  } satisfies AccessRequestPageResult;
}

export async function submitAccessDecline(token: string): Promise<AccessRequestPageResult> {
  const response = await fetch('/api/site-access/decline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.ok && payload.success) {
    return { state: 'success', expiresAt: '' };
  }

  return {
    state: mapAccessRequestErrorMessage(
      response.status,
      typeof payload.error === 'string' ? payload.error : undefined
    ),
  } satisfies AccessRequestPageResult;
}

export function formatAccessExpiryDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
