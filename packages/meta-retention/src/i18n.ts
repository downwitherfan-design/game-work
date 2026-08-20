/**
 * i18n پکیج — قرارداد §11: کلیدهای پیشونددار metaRetention.* از locales/fa.json،
 * دسترسی فقط از طریق t() قراردادی. (خط قرمز ۲۲: بدون رشته‌ی هاردکد در UI.)
 */
import { createTranslator, type LocaleMessages, type TranslateFn } from '@dordaneh/contracts';
import faMessages from '../locales/fa.json';

export const messages: LocaleMessages = faMessages as LocaleMessages;

/** مترجم پیش‌فرض پکیج (fa). app-shell می‌تواند مترجم سراسری تزریق کند. */
export const t: TranslateFn = createTranslator(messages);
