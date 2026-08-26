import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          exclude: ['tests/ui/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/ui/**'],
        },
      },
    ],
  },
});
