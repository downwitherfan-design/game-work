/** تست دود entry point — همه‌ی exportهای عمومی موجودند. */
import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index';

describe('@dordaneh/analytics — سطح API عمومی', () => {
  it('همه‌ی exportهای اصلی تعریف شده‌اند', () => {
    expect(typeof pkg.createAnalytics).toBe('function');
    expect(typeof pkg.wireAnalyticsToBus).toBe('function');
    expect(typeof pkg.createConsoleAdapter).toBe('function');
    expect(typeof pkg.createHttpAdapter).toBe('function');
    expect(typeof pkg.createNoopAdapter).toBe('function');
    expect(typeof pkg.resolveAdapter).toBe('function');
    expect(typeof pkg.bucketVariant).toBe('function');
    expect(typeof pkg.sanitizePayload).toBe('function');
    expect(typeof pkg.aggregateWordHealth).toBe('function');
    expect(typeof pkg.renderWordHealthReport).toBe('function');
    expect(typeof pkg.resolveExperiment).toBe('function');
    expect(typeof pkg.weekLabel).toBe('function');
    expect(pkg.DEFAULT_BATCH_SIZE).toBe(20);
    expect(pkg.DEFAULT_FLUSH_INTERVAL_MS).toBe(30_000);
    expect(pkg.MAX_QUEUE).toBe(500);
    expect(pkg.CONFIG_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(pkg.ALL_APP_EVENT_TYPES.length).toBe(11);
    expect(pkg.EXP_SHARE_CTA.id).toBe('share_cta_text_v1');
    expect(pkg.EXP_NOTIF_HOUR.id).toBe('notif_default_hour_v1');
  });
});
