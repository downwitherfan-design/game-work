/**
 * اجرای suite قرارداد ShareApi روی mock مرجع (و بعداً @dordaneh/viral-share واقعی).
 */

import { runShareContractSuite } from '../src/contract-suites/share.suite';
import { createMockShare } from '../src/mocks/share.mock';

runShareContractSuite('reference-mock', {
  makeShare: () => createMockShare(),
});

// TODO(AI-15 ↔ AI-07): با آماده‌شدن پکیج واقعی:
// import { createShareApi } from '@dordaneh/viral-share';
// runShareContractSuite('viral-share', { makeShare: createShareApi });
