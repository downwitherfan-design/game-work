/**
 * رجیستری آزمایش‌های A/B روز اول — سبک، بدون سرور، توزیع قطعی ۵۰/۵۰.
 *
 * الگو: هر آزمایش یک شناسه‌ی پایدار + نگاشت variant→مقدار دارد.
 * مصرف‌کننده (از طریق app-shell) فقط resolveExperiment را صدا می‌زند؛
 * exposure به‌صورت خودکار در getVariant ثبت می‌شود.
 */

import type { DordanehAnalytics } from './types';

export interface ExperimentDef<T> {
  /** شناسه‌ی پایدار — تغییرش یعنی rebucket همه؛ هرگز rename نکنید. */
  id: string;
  /** توضیح و فرضیه — برای طرح سنجش */
  hypothesis: string;
  /** متریک تصمیم (از docs-metrics.md) */
  metric: string;
  variants: { A: T; B: T };
}

/** آزمایش ۱: متن CTA اشتراک — فرضیه: لحن «دعوت به چالش» نرخ share را بالا می‌برد. */
export const EXP_SHARE_CTA: ExperimentDef<string> = {
  id: 'share_cta_text_v1',
  hypothesis: 'CTA چالشی («رفیقت می‌تونه بهتر از تو بزنه؟») نرخ share_initiated→completed را نسبت به CTA خنثی افزایش می‌دهد.',
  metric: 'share_rate (share_completed / puzzle_finished won)',
  variants: {
    A: 'اشتراک‌گذاری نتیجه', // کنترل — خنثی
    B: 'رفیقت می‌تونه بهتر از تو بزنه؟ 🎯', // چالشی
  },
};

/** آزمایش ۲: ساعت پیش‌فرض نوتیفیکیشن روزانه — فرضیه: عصر > صبح برای بازگشت. */
export const EXP_NOTIF_HOUR: ExperimentDef<number> = {
  id: 'notif_default_hour_v1',
  hypothesis: 'یادآور ساعت ۱۹ (فراغت عصر) نسبت به ۹ صبح D1 retention بالاتری می‌دهد.',
  metric: 'retention_d1',
  variants: { A: 9, B: 19 },
};

/** حل مقدار variant کاربر برای یک آزمایش + ثبت خودکار exposure. */
export function resolveExperiment<T>(analytics: DordanehAnalytics, def: ExperimentDef<T>): T {
  const v = analytics.getVariant(def.id);
  return def.variants[v];
}
