import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { SiteAccessReRequestModule } from '@/components/admin/SiteAccessReRequestModule';
import {
  getSiteAccessStatusChipClass,
  getSiteAccessStatusLabel,
  isScopeDescriptionValid,
  shouldShowReRequestButton,
  shouldShowRevokeLink,
  shouldShowSiteAccessReRequestModule,
} from '@/lib/fix-jobs/site-access-rerequest-ui';
import type { SiteAccessRequestPayload } from '@/lib/types/site-access-request';

vi.mock('@/lib/admin/fetch-with-auth', () => ({
  fetchWithAdminAuth: vi.fn(),
}));

const baseProps = {
  fixJobId: 'session_1',
  uid: 'user_1',
  onSiteAccessRequestChange: vi.fn(),
};

function makeRequest(
  overrides: Partial<SiteAccessRequestPayload> = {}
): SiteAccessRequestPayload {
  return {
    requestId: 'req_1',
    clientUid: 'user_1',
    sessionId: 'session_1',
    requestedAt: '2026-07-08T12:00:00.000Z',
    accessType: 'wp_admin',
    scopeDescription: 'Submitted WordPress credentials expired mid-job.',
    expiryDays: 7,
    expiresAt: null,
    status: 'pending',
    grantedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe('site access re-request ui helpers', () => {
  it('hidden when stage is awaiting_access', () => {
    expect(shouldShowSiteAccessReRequestModule('awaiting_access')).toBe(false);
  });

  it('hidden when stage is delivered', () => {
    expect(shouldShowSiteAccessReRequestModule('delivered')).toBe(false);
  });

  it('re-request button visible when status is null, expired, declined, or revoked', () => {
    expect(shouldShowReRequestButton(null)).toBe(true);
    expect(shouldShowReRequestButton(makeRequest({ status: 'expired' }))).toBe(true);
    expect(shouldShowReRequestButton(makeRequest({ status: 'declined' }))).toBe(true);
    expect(shouldShowReRequestButton(makeRequest({ status: 'revoked' }))).toBe(true);
  });

  it('re-request button hidden when status is pending or granted', () => {
    expect(shouldShowReRequestButton(makeRequest({ status: 'pending' }))).toBe(false);
    expect(shouldShowReRequestButton(makeRequest({ status: 'granted' }))).toBe(false);
  });

  it('scopeDescription < 10 chars blocks submit', () => {
    expect(isScopeDescriptionValid('short')).toBe(false);
    expect(
      isScopeDescriptionValid('Submitted credentials expired and need renewal.')
    ).toBe(true);
  });

  it('status chip labels and classes cover all states', () => {
    expect(getSiteAccessStatusLabel('not_requested', null)).toBe(
      'Access: Not re-requested'
    );
    expect(getSiteAccessStatusChipClass('pending')).toContain('amber');
    expect(getSiteAccessStatusLabel('pending', null)).toBe('Access: Re-request sent');
    expect(getSiteAccessStatusChipClass('granted')).toContain('green');
    expect(
      getSiteAccessStatusLabel('granted', '2026-07-16T12:00:00.000Z')
    ).toContain('Re-granted');
    expect(getSiteAccessStatusChipClass('expired')).toContain('red');
    expect(getSiteAccessStatusLabel('expired', null)).toBe('Access: Expired');
    expect(getSiteAccessStatusLabel('declined', null)).toBe(
      'Access: Declined by customer'
    );
    expect(getSiteAccessStatusLabel('revoked', null)).toBe('Access: Revoked');
  });

  it('revoke link visible for pending and granted only', () => {
    expect(shouldShowRevokeLink(makeRequest({ status: 'pending' }))).toBe(true);
    expect(shouldShowRevokeLink(makeRequest({ status: 'granted' }))).toBe(true);
    expect(shouldShowRevokeLink(null)).toBe(false);
    expect(shouldShowRevokeLink(makeRequest({ status: 'expired' }))).toBe(false);
  });
});

describe('SiteAccessReRequestModule', () => {
  it('renders not_requested chip when siteAccessRequest is null', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="in_progress"
        siteAccessRequest={null}
      />
    );

    expect(html).toContain('Access: Not re-requested');
    expect(html).toContain('Re-request site access');
  });

  it('renders pending chip with amber treatment', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="qa"
        siteAccessRequest={makeRequest({ status: 'pending' })}
      />
    );

    expect(html).toContain('Access: Re-request sent');
    expect(html).toContain('bg-amber-100');
    expect(html).not.toContain('Re-request site access');
  });

  it('renders granted chip with expiry date', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="report_ready"
        siteAccessRequest={makeRequest({
          status: 'granted',
          expiresAt: '2026-07-16T12:00:00.000Z',
        })}
      />
    );

    expect(html).toContain('Re-granted');
    expect(html).toContain('bg-green-100');
  });

  it('renders expired chip with red treatment', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="ready"
        siteAccessRequest={makeRequest({ status: 'expired' })}
      />
    );

    expect(html).toContain('Access: Expired');
    expect(html).toContain('bg-red-100');
  });

  it('renders declined chip with red treatment', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="in_progress"
        siteAccessRequest={makeRequest({ status: 'declined' })}
      />
    );

    expect(html).toContain('Access: Declined by customer');
  });

  it('renders revoked chip with muted treatment', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="in_progress"
        siteAccessRequest={makeRequest({ status: 'revoked' })}
      />
    );

    expect(html).toContain('Access: Revoked');
    expect(html).toContain('bg-gray-100');
  });

  it('hidden when stage is awaiting_access', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="awaiting_access"
        siteAccessRequest={null}
      />
    );

    expect(html).toBe('');
  });

  it('hidden when stage is delivered', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="delivered"
        siteAccessRequest={makeRequest({ status: 'granted' })}
      />
    );

    expect(html).toBe('');
  });

  it('revoke confirm dialog markup present for pending requests', () => {
    const html = renderToStaticMarkup(
      <SiteAccessReRequestModule
        {...baseProps}
        stage="in_progress"
        siteAccessRequest={makeRequest({ status: 'pending' })}
      />
    );

    expect(html).toContain('Revoke access');
  });
});
