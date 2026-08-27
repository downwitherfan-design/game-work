/**
 * i18n پکیج game-board — طبق قرارداد §11: کلیدهای پیشونددار gameBoard.*
 * از locales/fa.json؛ دسترسی فقط با t(). هیچ رشته‌ی هاردکد در UI.
 */

import { createTranslator, toPersianDigits, type TranslateFn } from '@dordaneh/contracts';
import faMessages from '../locales/fa.json';

export const t: TranslateFn = createTranslator(faMessages as Record<string, string>);

/** ترجمه + تبدیل ارقام به فارسی برای نمایش (خط قرمز #31) */
export function tFa(key: string, params?: Record<string, string | number>): string {
  return toPersianDigits(t(key, params));
}

/** تبدیل کد خطای کنترلر به پیام کاربر */
export function toastText(raw: string): string {
  if (raw.startsWith('WRONG_LENGTH:')) {
    const n = raw.slice('WRONG_LENGTH:'.length);
    return tFa('gameBoard.wrongLength', { n });
  }
  if (raw === 'INVALID_WORD') return t('gameBoard.invalidWord');
  if (raw === 'HINT_UNAVAILABLE') return t('gameBoard.hintUnavailable');
  return raw;
}
