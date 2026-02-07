import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});
