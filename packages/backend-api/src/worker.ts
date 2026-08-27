/**
 * Worker entry برای Cloudflare — فقط default export (الزام runtime).
 * exportهای عمومی پکیج در src/index.ts هستند.
 */

import { createApp } from './app';

const app = createApp();

export default app;
