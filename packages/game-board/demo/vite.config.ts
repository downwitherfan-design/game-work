import { defineConfig } from 'vite';

// دموی محلی AI-06 — jsxImportSource از tsconfig.base می‌آید (preact)
export default defineConfig({
  root: __dirname,
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
