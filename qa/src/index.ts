/**
 * @dordaneh/qa — مالک: AI-15. تست قرارداد، E2E، چک‌لیست انتشار، i18n.
 *
 * API عمومی این پکیج:
 *  - suiteهای قرارداد تزریق‌پذیر (contract-suites/*): روی هر پیاده‌سازی اجرا می‌شوند.
 *  - mockهای مرجع (mocks/*): تا آماده‌شدن پکیج‌های واقعی.
 *  - oracle: ارزیاب مرجع مستقل حدس (الگوریتم دو-گذره‌ی Wordle).
 *  - proptest: چارچوب مینیمال property-based بدون وابستگی.
 *
 * تست‌های اجرایی در qa/contract-tests/ (vitest) و qa/e2e/ (Playwright — پشت RFC).
 */

export * from './oracle';
export * from './proptest';

export * from './contract-suites/engine.suite';
export * from './contract-suites/word-db.suite';
export * from './contract-suites/culture.suite';
export * from './contract-suites/share.suite';
export * from './contract-suites/storage-bus.suite';
export * from './contract-suites/misc.suite';

export * from './mocks/engine.mock';
export * from './mocks/word-db.mock';
export * from './mocks/culture.mock';
export * from './mocks/share.mock';
export * from './mocks/misc.mock';
