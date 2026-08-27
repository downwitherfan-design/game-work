/**
 * اجرای suite قرارداد WordDbApi روی mock مرجع (و بعداً @dordaneh/word-db واقعی).
 */

import { runWordDbContractSuite } from '../src/contract-suites/word-db.suite';
import { createMockWordDb, MOCK_ANSWERS_6, MOCK_BLOCKLIST } from '../src/mocks/word-db.mock';

runWordDbContractSuite('reference-mock', {
  makeDb: () => createMockWordDb(),
  blocklist: MOCK_BLOCKLIST,
  scanRange: { from: 1, to: 730 },
  cycleLength: MOCK_ANSWERS_6.length,
});

// TODO(AI-15 ↔ AI-02): با آماده‌شدن دیتای واقعی:
// import { createWordDb } from '@dordaneh/word-db';
// import blocklist from '@dordaneh/word-db/data/blocklist.json';
// runWordDbContractSuite('word-db', { makeDb: createWordDb, blocklist, cycleLength: 2500 });
