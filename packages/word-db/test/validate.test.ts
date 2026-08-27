/**
 * دروازه‌ی CI — اجرای validateData روی داده‌های واقعی.
 * خروجی قرمز = کامیت ممنوع (طبق docs/02_CONTRACTS.md §2).
 */
import { describe, expect, it } from 'vitest';
import { formatReport, validateData } from '../tools/validate';

describe('tools/validate — دروازه‌ی CI داده', () => {
  const result = validateData();

  it('هیچ خطایی در داده‌ها وجود ندارد', () => {
    // گزارش همیشه چاپ می‌شود تا در لاگ CI دیده شود
    console.log(formatReport(result));
    expect(result.errors).toEqual([]);
  });

  it('حداقل‌های DoD برقرارند', () => {
    expect(result.stats.answers).toBeGreaterThanOrEqual(730);
    expect(result.stats.practice).toBeGreaterThanOrEqual(4000);
    expect(result.stats.valid).toBeGreaterThanOrEqual(15000);
    expect(result.stats.blocklist).toBeGreaterThanOrEqual(50);
  });

  it('formatReport برای نتیجه‌ی سبز پیام موفقیت می‌دهد', () => {
    expect(formatReport(result)).toContain('✅');
  });

  it('formatReport برای نتیجه‌ی قرمز خطاها را فهرست می‌کند', () => {
    const red = {
      errors: Array.from({ length: 60 }, (_, i) => `خطای ${String(i)}`),
      stats: { answers: 0, practice: 0, valid: 0, blocklist: 0 },
    };
    const report = formatReport(red);
    expect(report).toContain('❌');
    expect(report).toContain('60 خطا');
    expect(report).toContain('و 10 خطای دیگر');
  });
});
