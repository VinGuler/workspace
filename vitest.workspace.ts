import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'client',
          root: 'packages/client',
          environment: 'jsdom',
        },
        plugins: [vue()],
      },
      'packages/server/vitest.config.ts',
    ],
  },
});