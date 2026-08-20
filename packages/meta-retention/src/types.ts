/**
 * @dordaneh/meta-retention — تایپ‌های داخلی پکیج (مالک: AI-08).
 * داده فقط در کلیدهای رزروشده‌ی قرارداد ذخیره می‌شود:
 *   dor.streak → StreakState · dor.stats → StatsState · dor.album → AlbumState
 */

// ---------------------------------------------------------------------------
// dor.streak
// ---------------------------------------------------------------------------

export interface StreakState {
  /** استریک فعلی (روزهای متوالی بازی روزانه) */
  current: number;
  /** بهترین استریک تاریخی */
  best: number;
  /** شماره‌ی آخرین معمای روزانه‌ی بازی‌شده (null = هرگز بازی نکرده) */
  lastPlayedPuzzleNumber: number | null;
  /** تعداد فریز ذخیره‌شده (سقف ۲ برای کاربر عادی؛ طلایی نامحدود مصرف می‌کند) */
  freezes: number;
  /** مجموع فریزهای مصرف‌شده (برای دستاورد «یخ‌شکن») */
  freezesUsedTotal: number;
  /** آخرین مضرب ۷ استریک که بابت آن فریز رایگان داده شد (جلوگیری از اعطای دوباره) */
  lastFreezeEarnMilestone: number;
  /** تعداد موزاییک‌های ایرانی کامل‌شده (هر ۷ روز استریک = ۱ کاشی) */
  mosaicsCompleted: number;
}

/** نتیجه‌ی ثبت یک روز بازی در سیستم استریک */
export interface StreakUpdate {
  state: StreakState;
  /** آیا این فراخوانی استریک را تغییر داد؟ (بازی دوباره در همان روز = false) */
  changed: boolean;
  /** تعداد فریز مصرف‌شده در این آپدیت (برای پیام مهربان) */
  freezesConsumed: number;
  /** آیا استریک با فریز (یا نسخه‌ی طلایی) زنده ماند؟ */
  frozen: boolean;
  /** آیا استریک شکست و از نو شروع شد؟ */
  reset: boolean;
  /** آیا در این آپدیت فریز رایگان جدید گرفت؟ */
  freezeEarned: boolean;
  /** آیا یک موزاییک ۷تکه در این آپدیت کامل شد؟ */
  mosaicCompleted: boolean;
}

// ---------------------------------------------------------------------------
// dor.stats
// ---------------------------------------------------------------------------

export interface DailyResult {
  puzzleNumber: number;
  won: boolean;
  /** تعداد حدس‌ها (۱..۶) — برای باخت، ۶ ثبت می‌شود اما در هیستوگرام برد نمی‌آید */
  guessCount: number;
}

export interface NotificationPrefs {
  /** پیش‌فرض: خاموش (opt-in مهربان) */
  enabled: boolean;
  /** آیا قبلاً از کاربر اجازه خواسته‌ایم؟ (فقط یک‌بار می‌پرسیم) */
  asked: boolean;
  /** ساعت یادآور (۰..۲۳) — null یعنی از الگوی بازی کاربر محاسبه شود */
  hour: number | null;
  /** شماره‌ی آخرین معمایی که برایش نوتیف زمان‌بندی شد (سقف ۱ نوتیف/روز) */
  lastScheduledFor: number | null;
}

export interface StatsState {
  gamesPlayed: number;
  gamesWon: number;
  /** هیستوگرام توزیع حدس‌های برنده — ایندکس ۰ = برد با ۱ حدس */
  guessDist: [number, number, number, number, number, number];
  /** شماره‌ی معماهای روزانه‌ی بازی‌شده (برای تقویم شمسی) */
  playedPuzzles: number[];
  /** نتیجه‌ی آخرین بازی روزانه (برای highlight امروز در هیستوگرام) */
  lastResult: DailyResult | null;
  /** ساعت‌های (تهران، ۰..۲۳) آخرین بازی‌ها — حداکثر ۲۰ مورد، برای پیشنهاد ساعت نوتیف */
  playHours: number[];
  /** بردهای پیاپی فعلی (برای دستاورد «بی‌نقص») */
  winsInRow: number;
  /** دستاوردهای کسب‌شده: id → epoch ms */
  achievements: Record<string, number>;
  notif: NotificationPrefs;
  /** آمار مرور فاصله‌دار (برای دستاوردها) */
  reviewsDone: number;
  /** تعداد روزهای دُردانه‌ای که کاربر برده (برای دستاورد «خوش‌شانس») */
  dordanehDaysWon: number;
}

// ---------------------------------------------------------------------------
// dor.album
// ---------------------------------------------------------------------------

export interface DiscoveredCard {
  /** شماره‌ی معمایی که کارت در آن کشف شد (۰ = هدیه‌ی پیشرفت اعطاشده) */
  puzzleNumber: number;
  /** کارتِ «روز دُردانه» — قاب طلایی */
  golden?: boolean;
}

/** وضعیت مرور فاصله‌دار یک کارت (Leitner ساده با فواصل ۱،۳،۷،۱۴) */
export interface ReviewState {
  /** مرحله‌ی فعلی: ۰..۳ → فاصله‌ی بعدی از REVIEW_INTERVALS */
  stage: number;
  /** شماره‌ی معمایی (روزی) که مرور بعدی موعدش می‌رسد */
  nextDue: number;
  /** آخرین روزی که مرور شد */
  lastReviewed: number;
}

export interface AlbumState {
  /** کارت‌های کشف‌شده: cardId → متادیتا */
  discovered: Record<string, DiscoveredCard>;
  /** آیا هدیه‌ی «پیشرفت اعطاشده» (چند کارت اول رایگان) داده شده؟ */
  endowedGranted: boolean;
  /** وضعیت مرور فاصله‌دار هر کارت کشف‌شده */
  review: Record<string, ReviewState>;
}

// ---------------------------------------------------------------------------
// دستاوردها
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  /** کلید locale برای نام (metaRetention.ach.<id>.name) */
  icon: string;
}

export interface EarnedAchievement {
  id: string;
  earnedAt: number;
}

// ---------------------------------------------------------------------------
// ساعت تزریق‌پذیر (تست‌پذیری کامل منطق زمان)
// ---------------------------------------------------------------------------

export interface Clock {
  /** epoch ms اکنون */
  now(): number;
  /** شماره‌ی معمای امروز (Asia/Tehran — از قرارداد) */
  puzzleNumber(): number;
  /** ساعت محلی تهران ۰..۲۳ */
  tehranHour(): number;
}
