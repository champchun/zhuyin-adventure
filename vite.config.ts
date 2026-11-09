import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
