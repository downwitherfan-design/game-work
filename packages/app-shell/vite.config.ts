// کانفیگ build اپ نهایی — مالک: AI-14 (زیرساخت build). منطق اپ داخل src/ = مالکیت AI-05.
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    // بودجه‌ی حجم: باندل وب < 2MB gzip (گارد CI: tools/check-budget.mjs)
    chunkSizeWarningLimit: 500,
  },
});
