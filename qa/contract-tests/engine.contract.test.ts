/**
 * اجرای suite قرارداد EngineApi روی mock مرجع.
 * وقتی @dordaneh/core-engine واقعی (AI-01) آماده شد، CI (AI-14) همین suite را
 * با فیکسچر واقعی هم اجرا می‌کند — کافی است فیکسچر دوم اینجا اضافه شود.
 */

import { runEngineContractSuite } from '../src/contract-suites/engine.suite';
import { createMockEngine } from '../src/mocks/engine.mock';
import { createMockWordDb, MOCK_ANSWERS_6 } from '../src/mocks/word-db.mock';

runEngineContractSuite('reference-mock', {
  makeEngine: () => createMockEngine(createMockWordDb()),
  answerFor: (n) => MOCK_ANSWERS_6[((n % MOCK_ANSWERS_6.length) + MOCK_ANSWERS_6.length) % MOCK_ANSWERS_6.length] as string,
  validNonAnswer: 'بادبان',
  invalidWord: 'ژژژژژژ',
});

// TODO(AI-15 ↔ AI-01): پس از پیاده‌سازی واقعی، فیکسچر زیر را فعال کنید:
// import { createEngine } from '@dordaneh/core-engine';
// runEngineContractSuite('core-engine', { makeEngine: () => createEngine(...), ... });
