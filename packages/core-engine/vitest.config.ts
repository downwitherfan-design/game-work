import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // خطوط قرمز: evaluateGuess و ماشین حالت ۱۰۰٪ شاخه — کل پکیج ≥ ۹۵٪
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
        'src/evaluate-guess.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/state-machine.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
});
