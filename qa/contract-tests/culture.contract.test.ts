/**
 * اجرای suite قرارداد CultureApi روی mock مرجع (و بعداً @dordaneh/culture-cards واقعی).
 */

import { runCultureContractSuite } from '../src/contract-suites/culture.suite';
import { createMockCulture } from '../src/mocks/culture.mock';

runCultureContractSuite('reference-mock', {
  makeCulture: () => createMockCulture(),
  scanRange: { from: 1, to: 365 },
  sampleSolution: 'باغبان',
});

// TODO(AI-15 ↔ AI-03): با آماده‌شدن محتوا:
// import { createCultureApi } from '@dordaneh/culture-cards';
// runCultureContractSuite('culture-cards', { makeCulture: createCultureApi, sampleSolution: 'باغبان' });
