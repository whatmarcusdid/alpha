import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './'),
      'server-only': path.resolve(dirname, './lib/test-utils/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    // e2e/ holds Playwright specs (separate `test`/`expect` from
    // @playwright/test) — exclude them from Vitest's own discovery.
    exclude: [...configDefaults.exclude, 'e2e/**', 'tmp/**'],
  },
});
