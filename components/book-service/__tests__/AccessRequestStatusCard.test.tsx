import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { AccessRequestStatusCard } from '@/components/book-service/AccessRequestStatusCard';

describe('AccessRequestStatusCard', () => {
  it('grant loading state renders confirming copy', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard variant="grant" state="loading" />
    );

    expect(html).toContain('Confirming your access link');
  });

  it('grant success state renders confirmation copy and expiresAt date', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard
        variant="grant"
        state="success"
        formattedExpiresAt="Wednesday, July 16, 2026"
      />
    );

    expect(html).toContain('Access confirmed');
    expect(html).toContain('received your access');
    expect(html).toContain('Your access link expires on Wednesday, July 16, 2026');
  });

  it('grant already-used token response renders appropriate copy', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard variant="grant" state="already_used" />
    );

    expect(html).toContain('already been used or is no longer valid');
  });

  it('grant missing token renders error state', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard variant="grant" state="missing_token" />
    );

    expect(html).toContain('missing or invalid');
  });

  it('grant API failure renders generic error copy', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard variant="grant" state="error" />
    );

    expect(html).toContain('Something went wrong confirming your access');
  });

  it('grant expired link renders expired copy', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard variant="grant" state="expired" />
    );

    expect(html).toContain('This access link has expired');
  });

  it('decline success state renders decline confirmation copy', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard variant="decline" state="success" />
    );

    expect(html).toContain('be in touch');
    expect(html).toContain('not able to share access right now');
  });

  it('decline invalid token renders appropriate copy', () => {
    const html = renderToStaticMarkup(
      <AccessRequestStatusCard variant="decline" state="already_used" />
    );

    expect(html).toContain('already been used or is no longer valid');
  });
});
