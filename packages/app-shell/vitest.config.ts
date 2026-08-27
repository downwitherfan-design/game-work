import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // منطق پوسته (EventBus/Storage/theme/orchestrator/mocks/resolver) — هدف DoD ≥ ۸۰٪
      // کامپوننت‌های .tsx (UI) با E2E در qa/ پوشش داده می‌شوند (بدون jsdom در sandbox).
      include: [
        'src/core/**/*.ts',
        'src/services/**/*.ts',
        'src/mocks/**/*.ts',
        'src/app/screens.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
