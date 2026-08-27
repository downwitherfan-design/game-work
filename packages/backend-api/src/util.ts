/**
 * ابزارهای مشترک بک‌اند — sanitize نام، شناسه‌ی کوتاه، checksum، امتیاز.
 * فقط Web API (crypto) — بدون Node API (محیط Workers).
 */

import { normalizeFa, toPersianDigits } from '@dordaneh/contracts';

// ---------------------------------------------------------------------------
// اعتبارسنجی ورودی
// ---------------------------------------------------------------------------

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** anonId باید UUIDv4 باشد (قرارداد §7) */
export function isValidAnonId(v: unknown): v is string {
  return typeof v === 'string' && UUID_V4_RE.test(v);
}

export function isValidPuzzleNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 100_000;
}

// ---------------------------------------------------------------------------
// ضد تقلب حداقلی — نتیجه باید «ممکن» باشد
// ---------------------------------------------------------------------------

export const MIN_WIN_DURATION_MS = 5_000;
export const MAX_DURATION_MS = 6 * 60 * 60 * 1000; // ۶ ساعت — سقف منطقی یک روز

export interface ResultCheck {
  won: boolean;
  guessCount: number;
  durationMs: number;
}

/** آیا نتیجه‌ی گزارش‌شده از نظر قواعد بازی ممکن است؟ */
export function isPlausibleResult(r: ResultCheck): boolean {
  if (!Number.isInteger(r.guessCount) || r.guessCount < 1 || r.guessCount > 6) return false;
  if (!Number.isFinite(r.durationMs) || r.durationMs < 0 || r.durationMs > MAX_DURATION_MS)
    return false;
  if (r.won && r.durationMs < MIN_WIN_DURATION_MS) return false;
  // باخت یعنی همه‌ی ۶ حدس مصرف شده است
  if (!r.won && r.guessCount !== 6) return false;
  return true;
}

// ---------------------------------------------------------------------------
// امتیاز لیدربورد — قطعی و قابل بازتولید در کلاینت
// برد: پایه ۱۰۰۰ − ۱۰۰×(حدس−۱) − جریمه‌ی زمان (هر ۱۰ ثانیه ۱ امتیاز، سقف ۳۰۰)
// باخت: صفر
// ---------------------------------------------------------------------------

export function computeScore(won: boolean, guessCount: number, durationMs: number): number {
  if (!won) return 0;
  const guessPenalty = 100 * (guessCount - 1);
  const timePenalty = Math.min(300, Math.floor(durationMs / 10_000));
  return Math.max(1, 1000 - guessPenalty - timePenalty);
}

// ---------------------------------------------------------------------------
// نام مستعار — sanitize + محدودیت طول + فیلتر واژه‌های نامناسب (لیست کوچک داخلی)
// ---------------------------------------------------------------------------

export const MAX_NAME_LENGTH = 24;

/** لیست کوچک داخلی واژه‌های نامناسب (نرمال‌شده) — امن خانوادگی، خط قرمز ۲۹ */
const BLOCKED_NAME_WORDS: readonly string[] = [
  'کیر',
  'کس',
  'کون',
  'جنده',
  'کسکش',
  'حرومزاده',
  'حرامزاده',
  'گوه',
  'لاشی',
  'بیشعور',
  'فاک',
  'fuck',
  'shit',
  'bitch',
  'ass',
  'dick',
  'cunt',
  'porn',
  'sex',
].map((w) => normalizeFa(w).toLowerCase());

/** حذف کاراکترهای کنترلی/نامرئی و علامت‌های خطرناک؛ فقط حروف/ارقام/فاصله/چند علامت امن */
function stripUnsafe(s: string): string {
  // حذف کاراکترهای کنترلی و جهت‌دهی
  let out = s.replace(/[\u0000-\u001F\u007F\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  // فقط: حروف (هر زبان)، ارقام، فاصله، نقطه، خط تیره، زیرخط
  out = out.replace(/[^\p{L}\p{N} ._\u200C-]/gu, '');
  // فشرده‌سازی فاصله‌ها
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function containsBlockedWord(nameNormalized: string): boolean {
  const flat = nameNormalized.toLowerCase().replace(/[\s._-]/g, '');
  return BLOCKED_NAME_WORDS.some((w) => flat.includes(w));
}

/** نام پیش‌فرض: «مسافر + عدد» (قرارداد §7) — عدد از anonId مشتق می‌شود (قطعی) */
export function defaultName(anonId: string): string {
  let h = 0;
  for (let i = 0; i < anonId.length; i++) h = (h * 31 + anonId.charCodeAt(i)) >>> 0;
  return `مسافر ${toPersianDigits((h % 9000) + 1000)}`;
}

/**
 * نام نمایشی امن: sanitize + نرمال‌سازی + سقف طول + فیلتر ناسزا.
 * نام خالی/نامعتبر/نامناسب → نام پیش‌فرض «مسافر + عدد».
 */
export function sanitizeName(raw: unknown, anonId: string): string {
  if (typeof raw !== 'string') return defaultName(anonId);
  const cleaned = stripUnsafe(normalizeFa(raw)).slice(0, MAX_NAME_LENGTH).trim();
  if (cleaned.length === 0) return defaultName(anonId);
  if (containsBlockedWord(normalizeFa(cleaned))) return defaultName(anonId);
  return cleaned;
}

// ---------------------------------------------------------------------------
// شناسه‌ی کوتاه URL-safe برای circle/duel — از Web Crypto
// ---------------------------------------------------------------------------

const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // بدون کاراکترهای مبهم

export function shortId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ID_ALPHABET[(bytes[i] as number) % ID_ALPHABET.length];
  }
  return out;
}

/** seed دوئل — عدد صحیح مثبت ۳۱ بیتی */
export function randomSeed(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] as number) & 0x7fffffff || 1;
}

// ---------------------------------------------------------------------------
// checksum معمای روزانه — sha256hex('dordaneh:v1:<n>:<normalizeFa(answer)>')
// سرور جواب را ذخیره نمی‌کند؛ این تابع برای ابزار ops و تست‌هاست.
// ---------------------------------------------------------------------------

export async function dailyChecksum(puzzleNumber: number, answer: string): Promise<string> {
  const payload = `dordaneh:v1:${puzzleNumber}:${normalizeFa(answer)}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
