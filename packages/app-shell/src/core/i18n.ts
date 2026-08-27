/**
 * i18n پوسته — طبق قرارداد §11: همه‌ی متن‌ها از locales/fa.json با پیشوند appShell.
 * دسترسی فقط از طریق t() قراردادی (createTranslator از contracts).
 */
import {
  createTranslator,
  DEFAULT_LOCALE,
  type Locale,
  type LocaleMessages,
  type TranslateFn,
} from '@dordaneh/contracts';
import faMessages from '../../locales/fa.json';

const messagesByLocale: Partial<Record<Locale, LocaleMessages>> = {
  fa: faMessages as LocaleMessages,
};

let currentLocale: Locale = DEFAULT_LOCALE;
let translate: TranslateFn = createTranslator(messagesByLocale[currentLocale] ?? {});

export function getLocale(): Locale {
  return currentLocale;
}

/** فعلاً فقط fa — ساختار آماده‌ی en/ar (قرارداد §11) */
export function setLocale(locale: Locale): void {
  currentLocale = messagesByLocale[locale] ? locale : DEFAULT_LOCALE;
  translate = createTranslator(messagesByLocale[currentLocale] ?? {});
}

export const t: TranslateFn = (key, params) => translate(key, params);
