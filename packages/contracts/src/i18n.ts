/**
 * @dordaneh/contracts — i18n contract (overseen by AI-15 in qa/).
 * Source of truth: docs/02_CONTRACTS.md §11. Locked (RFC only).
 * هر پکیج UI فایل locales/fa.json خودش را دارد؛ کلیدها با پیشوند پکیج:
 * "gameBoard.submit": "ثبت حدس". دسترسی فقط از طریق t().
 */

export type Locale = 'fa' | 'en' | 'ar';

export const DEFAULT_LOCALE: Locale = 'fa';

/** فایل locale هر پکیج: نگاشت تختِ کلید پیشونددار → متن */
export type LocaleMessages = Record<string, string>;

/** تابع ترجمه‌ی قراردادی — تنها راه دسترسی UI به متن‌ها */
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export interface I18nApi {
  t: TranslateFn;
  getLocale(): Locale;
  setLocale(locale: Locale): void;
}

/**
 * پیاده‌سازی مرجع سبک — جایگذاری {param} + فالبک به خود کلید (کلید گمشده
 * هرگز UI را نمی‌شکند؛ در QA با تست کلیدهای گمشده شکار می‌شود).
 */
export function createTranslator(messages: LocaleMessages): TranslateFn {
  return (key, params) => {
    const template = messages[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (m, p: string) => {
      const v = params[p];
      return v === undefined ? m : String(v);
    });
  };
}
