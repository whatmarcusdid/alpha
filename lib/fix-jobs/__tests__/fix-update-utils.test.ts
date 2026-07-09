import { describe, expect, it } from 'vitest';

import { validateFixUpdateMessage } from '@/lib/fix-jobs/post-fix-update';
import {
  findDeniedToolName,
  isCharacterCounterWarning,
  isPostUpdateDisabled,
} from '@/lib/fix-jobs/fix-update-utils';
import { getPlaybookEntry } from '@/lib/audit/fixPlaybook';

describe('fix update validation', () => {
  it('"We configured WP Rocket" → 400 naming "WP Rocket"', () => {
    const result = validateFixUpdateMessage('We configured WP Rocket');
    expect(result?.error).toContain('WP Rocket');
  });

  it('"We sped up your site\'s caching" → passes validation', () => {
    expect(validateFixUpdateMessage("We sped up your site's caching")).toBeNull();
  });

  it('empty message after trim → 400', () => {
    expect(validateFixUpdateMessage('')).toEqual({
      status: 400,
      error: 'Message cannot be empty',
    });
  });

  it('281 character message → 400', () => {
    expect(validateFixUpdateMessage('a'.repeat(281))).toEqual({
      status: 400,
      error: 'Message must be 280 characters or fewer',
    });
  });

  it('denylist is case-insensitive', () => {
    expect(findDeniedToolName('sucuri found malware')).toBe('Sucuri');
  });
});

describe('composer UI helpers', () => {
  it('character counter turns red above 260', () => {
    expect(isCharacterCounterWarning(261)).toBe(true);
    expect(isCharacterCounterWarning(260)).toBe(false);
  });

  it('post button disabled at 0 chars and above 280', () => {
    expect(isPostUpdateDisabled(0)).toBe(true);
    expect(isPostUpdateDisabled(281)).toBe(true);
    expect(isPostUpdateDisabled(120)).toBe(false);
  });

  it('prefill uses exact clientSummaryTemplate for signal', () => {
    const template = getPlaybookEntry('no_https').clientSummaryTemplate;
    expect(template.length).toBeGreaterThan(0);
    expect(template).toContain('HTTPS');
  });
});
