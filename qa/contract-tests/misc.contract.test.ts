/**
 * اجرای suite قرارداد Analytics / Audio / Monetization روی mockهای مرجع.
 */

import type { AnalyticsApi, AppEvent } from '@dordaneh/contracts';
import {
  runAnalyticsContractSuite,
  runAudioContractSuite,
  runMonetizationContractSuite,
} from '../src/contract-suites/misc.suite';
import { createMockAnalytics, createMockAudio, createMockMonetization } from '../src/mocks/misc.mock';

runAnalyticsContractSuite('reference-mock', {
  makeAnalytics: () => createMockAnalytics(),
  drainQueue: (api: AnalyticsApi) => (api as AnalyticsApi & { queue: AppEvent[] }).queue,
});

runAudioContractSuite('reference-mock', {
  makeAudio: () => createMockAudio(),
});

runMonetizationContractSuite('reference-mock(dev)', {
  makeMonetization: () => createMockMonetization(),
  isDevMock: true,
});

// TODO(AI-15 ↔ AI-11/12/13): فیکسچرهای واقعی با آماده‌شدن پکیج‌ها اضافه می‌شوند.
