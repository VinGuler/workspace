import { fileURLToPath } from 'node:url';
import { defineConfig, configDefaults } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    name: 'client-server-database',
    root: fileURLToPath(new URL('./', import.meta.url)),
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
});
