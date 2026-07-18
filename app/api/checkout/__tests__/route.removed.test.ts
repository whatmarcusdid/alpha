import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('legacy /api/checkout route', () => {
  it('is removed from the app router', () => {
    const routePath = join(process.cwd(), 'app/api/checkout/route.ts');
    expect(existsSync(routePath)).toBe(false);
  });
});
