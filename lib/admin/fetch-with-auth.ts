import { getCurrentUser } from '@/lib/auth';

export async function fetchWithAdminAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const user = getCurrentUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
