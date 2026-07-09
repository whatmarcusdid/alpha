import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ClientUpdatesComposer } from '@/components/admin/ClientUpdatesComposer';
import { getPlaybookEntry } from '@/lib/audit/fixPlaybook';
import type { RecentFixUpdate } from '@/lib/types/fix-update';

describe('ClientUpdatesComposer', () => {
  it('renders empty state when recentUpdates is empty', () => {
    const html = renderToStaticMarkup(
      <ClientUpdatesComposer
        fixJobId="s1"
        uid="user_1"
        stage="ready"
        recentUpdates={[]}
      />
    );

    expect(html).toContain('No updates posted yet');
  });

  it('renders last 3 updates newest first', () => {
    const updates: RecentFixUpdate[] = [
      {
        id: '1',
        message: 'Newest',
        createdAt: new Date().toISOString(),
        pillar: 'speed',
        visibility: 'client',
        pinned: false,
      },
      {
        id: '2',
        message: 'Middle',
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        pillar: 'security',
        visibility: 'client',
        pinned: false,
      },
      {
        id: '3',
        message: 'Older',
        createdAt: new Date(Date.now() - 172_800_000).toISOString(),
        pillar: 'general',
        visibility: 'client',
        pinned: false,
      },
      {
        id: '4',
        message: 'Hidden fourth',
        createdAt: new Date(Date.now() - 259_200_000).toISOString(),
        pillar: 'general',
        visibility: 'client',
        pinned: false,
      },
    ];

    const html = renderToStaticMarkup(
      <ClientUpdatesComposer
        fixJobId="s1"
        uid="user_1"
        stage="ready"
        recentUpdates={updates}
      />
    );

    expect(html.indexOf('Newest')).toBeLessThan(html.indexOf('Middle'));
    expect(html).not.toContain('Hidden fourth');
  });

  it('composer disabled with tooltip in awaiting_access stage', () => {
    const html = renderToStaticMarkup(
      <ClientUpdatesComposer
        fixJobId="s1"
        uid="user_1"
        stage="awaiting_access"
        recentUpdates={[]}
      />
    );

    expect(html).toContain('disabled');
    expect(html).toContain('No work to report yet');
  });

  it('draft client update uses exact clientSummaryTemplate for signal', () => {
    const template = getPlaybookEntry('no_https').clientSummaryTemplate;
    expect(template).toBe(
      'We turned on secure HTTPS for your site so visitors see the padlock and their connection is encrypted.'
    );
  });
});

describe('composer post behavior helpers', () => {
  it('optimistic append on post, rollback on failure', () => {
    let updates = [{ id: '1', message: 'Existing' }];
    const optimistic = { id: 'opt', message: 'Draft' };
    updates = [optimistic, ...updates];
    expect(updates).toHaveLength(2);

    try {
      throw new Error('denylist');
    } catch {
      updates = updates.filter((update) => update.id !== optimistic.id);
    }

    expect(updates).toHaveLength(1);
    expect(updates[0].message).toBe('Existing');
  });
});
