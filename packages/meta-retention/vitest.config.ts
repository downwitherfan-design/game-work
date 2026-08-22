import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // UI (tsx) با تست‌های E2E پوشش داده می‌شود (qa/ — AI-15)؛ منطق در ts خالص است
      exclude: ['src/**/*.d.ts', 'src/index.ts', 'src/types.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
