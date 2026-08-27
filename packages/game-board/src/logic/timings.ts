/**
 * ثابت‌های زمان‌بندی انیمیشن‌ها — منبع واحد برای CSS و ارکستراسیون JS.
 * مبانی: Doherty & Thadani 1982 (پاسخ < 100ms)، الگوی flip پلکانی Wordle
 * (تعلیق = دوپامین انتظار)، Swink 2008 (Game Feel).
 */
export const TIMINGS = {
  /** پاپ ظریف کاشی هنگام تایپ — باید خیلی کوتاه باشد تا حس فوری بدهد */
  tapPopMs: 110,
  /** مدت چرخش (flip) هر کاشی هنگام ثبت حدس */
  flipDurationMs: 520,
  /** فاصله‌ی پلکانی بین flip کاشی‌ها (~250ms طبق مشخصات) */
  flipStaggerMs: 250,
  /** لرزش افقی ردیف برای حدس نامعتبر */
  shakeMs: 480,
  /** فاصله‌ی پلکانی موج پرش حروف هنگام برد */
  winWaveStaggerMs: 80,
  /** مدت پرش هر حرف در موج برد */
  winWaveMs: 620,
  /** ماندگاری Toast */
  toastMs: 2400,
  /** تأخیر بازشدن مودال نتیجه پس از پایان انیمیشن برد/باخت */
  resultModalDelayMs: 1400,
} as const;

/** تأخیر شروع flip کاشی iام (صفر-مبنا) در ردیف */
export function flipDelayMs(tileIndex: number): number {
  return tileIndex * TIMINGS.flipStaggerMs;
}

/** لحظه‌ی نمایش رنگ/صدای وضعیت کاشی iام (نیمه‌ی چرخش) */
export function revealMomentMs(tileIndex: number): number {
  return flipDelayMs(tileIndex) + Math.round(TIMINGS.flipDurationMs / 2);
}

/** کل زمان لازم برای نمایش کامل یک ردیف wordLength حرفی */
export function revealTotalMs(wordLength: number): number {
  if (wordLength <= 0) return 0;
  return flipDelayMs(wordLength - 1) + TIMINGS.flipDurationMs;
}
