import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');

  return {
    plugins: [tsconfigPaths(), react()],
    test: {
      environment: 'node',
      environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
      setupFiles: ['./vitest.setup.ts'],
      clearMocks: true,
    },
  };
});
