/**
 * Vitest uses TypeScript via esbuild; for IDE / optional typecheck of tests,
 * use `pnpm typecheck:test` (see tsconfig.test.json — includes vitest/globals).
 * Production `tsc` uses tsconfig.json only (no vitest types — Railway omits devDependencies).
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
