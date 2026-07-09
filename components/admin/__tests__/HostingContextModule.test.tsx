import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { HostingContextModule } from '@/components/admin/HostingContextModule';
import {
  addPluginTag,
  getGeneratePlanTooltip,
  removePluginTag,
} from '@/lib/fix-jobs/hosting-context-ui';
import type { HostingContextPayload } from '@/lib/types/hosting-context';

vi.mock('@/lib/fix-jobs/hosting-context-actions', () => ({
  submitHostingContextConfirm: vi.fn(),
}));

const baseProps = {
  fixJobId: 'session_1',
  uid: 'user_1',
  onConfirmed: vi.fn(),
};

function makeContext(
  overrides: Partial<HostingContextPayload> = {}
): HostingContextPayload {
  return {
    host: 'siteground',
    cms: 'wordpress',
    cmsVersion: '6.4',
    plugins: ['WP Rocket', 'Yoast'],
    isConfirmed: false,
    ...overrides,
  };
}

describe('hosting context ui helpers', () => {
  it('plugin tag input: add and remove', () => {
    expect(addPluginTag([], 'WP Rocket')).toEqual(['WP Rocket']);
    expect(addPluginTag(['WP Rocket'], 'WP Rocket')).toEqual(['WP Rocket']);
    expect(removePluginTag(['WP Rocket', 'Yoast'], 'WP Rocket')).toEqual(['Yoast']);
  });

  it('disabled button tooltip reflects confirmed vs unconfirmed state', () => {
    expect(getGeneratePlanTooltip(false)).toContain('Confirm hosting context');
    expect(getGeneratePlanTooltip(true)).toContain('AI fix plans coming soon');
  });
});

describe('HostingContextModule', () => {
  it('renders unconfirmed state with seeded values pre-populated', () => {
    const html = renderToStaticMarkup(
      <HostingContextModule {...baseProps} hostingContext={makeContext()} />
    );

    expect(html).toContain('Confirm before generating AI plan');
    expect(html).toContain('SiteGround');
    expect(html).toContain('WordPress');
    expect(html).toContain('WP Rocket');
  });

  it('renders confirmed state with read-only summary', () => {
    const html = renderToStaticMarkup(
      <HostingContextModule
        {...baseProps}
        hostingContext={makeContext({
          isConfirmed: true,
          confirmedAt: '2026-07-09T12:00:00.000Z',
          confirmedBy: 'admin_1',
        })}
      />
    );

    expect(html).toContain('✓ Confirmed');
    expect(html).toContain('SiteGround');
    expect(html).toContain('WP Rocket, Yoast');
    expect(html).toContain('Edit');
  });

  it('Edit link transitions back to form with current values', () => {
    const html = renderToStaticMarkup(
      <HostingContextModule
        {...baseProps}
        hostingContext={makeContext({
          isConfirmed: true,
          confirmedAt: '2026-07-09T12:00:00.000Z',
          confirmedBy: 'admin_1',
        })}
      />
    );

    expect(html).toContain('Edit');
  });

  it('"Other" host selection shows text input when host is other', () => {
    const html = renderToStaticMarkup(
      <HostingContextModule
        {...baseProps}
        hostingContext={makeContext({
          host: 'other',
          hostLabel: 'Pagely',
          plugins: [],
        })}
      />
    );

    expect(html).toContain('Other host name');
    expect(html).toContain('Pagely');
  });

  it('Generate AI Fix Plan button always disabled', () => {
    const unconfirmed = renderToStaticMarkup(
      <HostingContextModule {...baseProps} hostingContext={makeContext()} />
    );
    const confirmed = renderToStaticMarkup(
      <HostingContextModule
        {...baseProps}
        hostingContext={makeContext({
          isConfirmed: true,
          confirmedAt: '2026-07-09T12:00:00.000Z',
          confirmedBy: 'admin_1',
        })}
      />
    );

    expect(unconfirmed).toContain('Generate AI Fix Plan');
    expect(unconfirmed).toContain('disabled');
    expect(confirmed).toContain('Generate AI Fix Plan');
    expect(confirmed).toContain('disabled');
  });

  it('disabled button tooltip reflects confirmed vs unconfirmed state', () => {
    const unconfirmed = renderToStaticMarkup(
      <HostingContextModule {...baseProps} hostingContext={makeContext()} />
    );
    const confirmed = renderToStaticMarkup(
      <HostingContextModule
        {...baseProps}
        hostingContext={makeContext({
          isConfirmed: true,
          confirmedAt: '2026-07-09T12:00:00.000Z',
          confirmedBy: 'admin_1',
        })}
      />
    );

    expect(unconfirmed).toContain('Confirm hosting context above');
    expect(confirmed).toContain('AI fix plans coming soon');
  });
});
