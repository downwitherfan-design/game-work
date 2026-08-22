/**
 * @dordaneh/ui-kit — دسترسی متن‌ها فقط از طریق t() قرارداد (خط قرمز ۲۲).
 * کلیدها با پیشوند uiKit در locales/fa.json.
 */
import { createTranslator, type TranslateFn } from '@dordaneh/contracts';
import faMessages from './locales/fa.json';

export const t: TranslateFn = createTranslator(faMessages as Record<string, string>);
