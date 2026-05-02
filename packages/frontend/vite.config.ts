/**
 * Production `tsc` uses tsconfig.json (vite/client only).
 * Test globals: `pnpm typecheck:test` uses tsconfig.test.json (vitest, jest-dom).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Prefer TypeScript/TSX over stale .js copies in src
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  server: {
    port: 5173,
    host: true, // Listen on 0.0.0.0 so localhost (IPv4) and ::1 (IPv6) both work
    strictPort: false, // Use next available port (e.g. 5174) if 5173 is in use
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    passWithNoTests: true,
  },
});
