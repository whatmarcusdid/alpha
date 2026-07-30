// Test-inbox fixture backed by testmail.app's REST API — no SDK/new npm
// dependency required (plain fetch). Requires TESTMAIL_API_KEY and
// TESTMAIL_NAMESPACE in .env.local (see https://testmail.app docs); every
// address of the form `{namespace}.{tag}@inbox.testmail.app` is independently
// receivable and queryable by `tag`, which is what makes createTestEmail()
// safe to call once per test without cross-test collisions.

const TESTMAIL_DOMAIN = 'inbox.testmail.app';

function requireTestmailEnv(): { apiKey: string; namespace: string } {
  const apiKey = process.env.TESTMAIL_API_KEY;
  const namespace = process.env.TESTMAIL_NAMESPACE;

  if (!apiKey || !namespace) {
    throw new Error(
      'testmail.app is not configured — set TESTMAIL_API_KEY and TESTMAIL_NAMESPACE ' +
        'in .env.local (see https://testmail.app) before running tests that check email delivery.'
    );
  }

  return { apiKey, namespace };
}

export type TestEmail = {
  /** Real, receivable address when TESTMAIL_NAMESPACE is set; otherwise a
   *  syntactically valid but non-receivable placeholder — fine for tests
   *  that only need a unique email, not inbox verification. */
  email: string;
  /** The unique tag portion, used to poll testmail.app for messages sent to this address. */
  tag: string;
};

/**
 * Returns a unique test email address for one test run. Only throws (via
 * waitForTestmailMessage) when a test actually polls the inbox — most specs
 * just need a unique address, not delivery verification, so this must not
 * hard-require testmail.app credentials up front.
 */
export function createTestEmail(prefix = 'bs-e2e'): TestEmail {
  const tag = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const namespace = process.env.TESTMAIL_NAMESPACE;
  const domain = namespace ? TESTMAIL_DOMAIN : 'example.com';
  const email = namespace ? `${namespace}.${tag}@${domain}` : `${tag}@${domain}`;
  return { email, tag };
}

export type TestmailAttachment = {
  filename: string;
  contentType: string;
  size: number;
};

export type TestmailMessage = {
  subject: string;
  from: string;
  text: string;
  html: string;
  timestamp: number;
  attachments: TestmailAttachment[];
};

type TestmailApiResponse = {
  result: 'success' | 'fail';
  message?: string;
  count: number;
  emails: TestmailMessage[];
};

/**
 * Polls testmail.app for a message matching `tag`, optionally filtered by a
 * subject pattern. Uses testmail's `livequery=true`, which holds the request
 * open server-side until a matching email arrives (or its own ~55s timeout),
 * so this is a small retry loop around a long-poll rather than tight polling.
 */
export async function waitForTestmailMessage(
  tag: string,
  options: { subjectMatch?: RegExp; timeoutMs?: number } = {}
): Promise<TestmailMessage> {
  const { apiKey, namespace } = requireTestmailEnv();
  const timeoutMs = options.timeoutMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;

  let lastCount = 0;

  while (Date.now() < deadline) {
    const url = new URL('https://api.testmail.app/api/json');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('namespace', namespace);
    url.searchParams.set('tag', tag);
    url.searchParams.set('livequery', 'true');

    const response = await fetch(url.toString());
    const payload = (await response.json()) as TestmailApiResponse;

    if (payload.result !== 'success') {
      throw new Error(`testmail.app query failed: ${payload.message ?? 'unknown error'}`);
    }

    lastCount = payload.count;
    const match = options.subjectMatch
      ? payload.emails.find((email) => options.subjectMatch!.test(email.subject))
      : payload.emails[0];

    if (match) {
      return match;
    }
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for a testmail.app message ` +
      `(tag="${tag}", subjectMatch=${options.subjectMatch ?? 'any'}, messages seen=${lastCount}).`
  );
}
