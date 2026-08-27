/**
 * i18n داخلی پکیج — طبق قرارداد §11: هر پکیج UI فایل locales/fa.json
 * خودش را دارد؛ دسترسی فقط از طریق t().
 */

import { createTranslator, type LocaleMessages, type TranslateFn } from '@dordaneh/contracts';
import faMessages from '../locales/fa.json';

export const messages: LocaleMessages = faMessages as LocaleMessages;

/** مترجم پیش‌فرض پکیج (fa) — app-shell می‌تواند t سراسری تزریق کند */
export const defaultT: TranslateFn = createTranslator(messages);
