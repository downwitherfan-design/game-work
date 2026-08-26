/**
 * کانفیگ vite برای اجرای نمایشگاه دیزاین‌سیستم:
 *   از ریشه‌ی ریپو:  npx vite --config packages/ui-kit/demo/vite.config.ts
 */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  server: { host: '0.0.0.0', port: 3000, fs: { allow: [resolve(here, '../../..')] } },
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  resolve: {
    alias: {
      '@dordaneh/contracts': resolve(here, '../../contracts/src/index.ts'),
    },
  },
});
