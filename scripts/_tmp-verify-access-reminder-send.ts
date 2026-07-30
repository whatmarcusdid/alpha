// One-off verification: real send of sendSiteFixAccessReminderEmail() through
// the NEW LOOPS_SITE_FIX_ACCESS_REMINDER_TEMPLATE_ID (cms3o73l500nz0j0y7gbl8jg7),
// then poll testmail.app to confirm actual inbox delivery — not just a 200
// from the Loops API. Overrides the template-id env var in-process only;
// .env.local itself still holds the old id and is deliberately left untouched.
// Delete this file after use.

import { loadDotEnvFile } from '../lib/fix-jobs/seed-fix-job-utils';
import { sendSiteFixAccessReminderEmail } from '../lib/book-service/emails';
import { createTestEmail, waitForTestmailMessage } from '../e2e/support/testmail';

loadDotEnvFile('.env.local');
process.env.LOOPS_SITE_FIX_ACCESS_REMINDER_TEMPLATE_ID = 'cms3o73l500nz0j0y7gbl8jg7';

async function main() {
  const testEmail = createTestEmail('bs-e2e-reminder-verify');
  const orderId = `order-verify-${Date.now()}`;
  const accessUrl = `http://localhost:3000/book-service/access?orderId=${orderId}`;

  console.log('Sending to:', testEmail.email);
  console.log('orderId:', orderId);

  await sendSiteFixAccessReminderEmail({
    email: testEmail.email,
    firstName: 'QA',
    orderId,
    accessUrl,
  });
  console.log('Loops API call returned success (no throw) — checking inbox now...');

  const message = await waitForTestmailMessage(testEmail.tag, { timeoutMs: 60_000 });

  console.log('\n=== MESSAGE ARRIVED ===');
  console.log('Subject:', message.subject);
  console.log('From:', message.from);
  console.log('\n--- HTML body ---\n');
  console.log(message.html);

  const checks = {
    subjectHasOrderId: message.subject.includes(orderId),
    subjectMatchesExpected: /Action needed: share site access for order/.test(message.subject),
    bodyHasFirstName: /Hi QA,/.test(message.html) || /Hi QA,/.test(message.text),
    bodyHasOrderId: message.html.includes(orderId) || message.text.includes(orderId),
    bodyHasAccessUrl: message.html.includes(accessUrl) || message.text.includes(accessUrl),
    bodyHasHeading: /We.re waiting on site access/i.test(message.html + message.text),
  };

  console.log('\n=== VARIABLE-BINDING CHECKS ===');
  for (const [check, result] of Object.entries(checks)) {
    console.log(`${result ? 'PASS' : 'FAIL'} — ${check}`);
  }

  const allPassed = Object.values(checks).every(Boolean);
  console.log(allPassed ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('ERROR:', error);
  process.exit(1);
});
