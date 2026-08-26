/**
 * @dordaneh/analytics — تایپ‌های داخلی پکیج (مالک: AI-12).
 * فقط از @dordaneh/contracts import می‌شود (نمودار وابستگی مسترپلن §2).
 */

import type { AppEvent, StorageApi } from '@dordaneh/contracts';

/** متادیتای ناشناس که به هر رویداد الصاق می‌شود — هرگز PII (خط قرمز ۲۸). */
export interface EventMeta {
  /** UUIDv4 محلی — هویت ناشناس (خط قرمز ۱۴) */
  anonId: string;
  /** شناسه‌ی جلسه — هر بار ساخت instance جدید */
  sessionId: string;
  appVersion: string;
  platform: string;
  locale: string;
  /** برچسب کوهورت هفته‌ی نصب: 'YYYY-Www' — برای مقایسه‌ی retention نسخه‌ها */
  installWeek: string;
  /** شماره‌ترتیب رویداد در این جلسه (تشخیص گم‌شدگی) */
  seq: number;
}

/**
 * رکورد سیمی (wire format) — قالبی که در صف می‌نشیند و به endpoint می‌رود.
 * `event` معمولاً AppEvent['type'] است؛ رویدادهای داخلی آنالیتیکس
 * (مثل 'experiment_exposed' تا تأیید RFC-0012) هم با همین قالب ژنریک می‌روند.
 */
export interface WireEvent {
  event: string;
  /** payload رویداد پس از عبور از گارد ضد-PII */
  payload: Record<string, unknown>;
  meta: EventMeta;
  /** epoch ms زمان رخداد */
  ts: number;
}

/** نتیجه‌ی ارسال یک دسته */
export type SendResult = boolean | Promise<boolean>;

/** آداپتور مقصد — console برای dev، http برای تولید، noop خنثی. */
export interface TransportAdapter {
  readonly name: string;
  /** true = دسته پذیرفته شد و از صف حذف می‌شود؛ false = در صف بماند. */
  send(batch: readonly WireEvent[]): SendResult;
}

/** حداقل سطح DOM لازم برای flush روی visibilitychange — SSR-safe. */
export interface DocumentLike {
  visibilityState?: string;
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
}

export interface AnalyticsOptions {
  storage: StorageApi;
  /** آداپتور صریح؛ اگر ندهید از env/حالت dev استنتاج می‌شود. */
  adapter?: TransportAdapter;
  /** endpoint تولید (POST /events) — بر env مقدم است. */
  endpoint?: string;
  appVersion?: string;
  platform?: string;
  locale?: string;
  /** آستانه‌ی ارسال دسته‌ای (پیش‌فرض ۲۰ رویداد) */
  batchSize?: number;
  /** بازه‌ی flush دوره‌ای (پیش‌فرض ۳۰ثانیه) */
  flushIntervalMs?: number;
  /** سقف صف آفلاین FIFO (پیش‌فرض ۵۰۰) */
  maxQueue?: number;
  /** ساعت تزریق‌پذیر برای تست */
  now?: () => number;
  /** منبع تصادفی تزریق‌پذیر برای تست (uuid) */
  random?: () => number;
  /** سند برای visibilitychange؛ null = بدون listener (تست/SSR) */
  doc?: DocumentLike | null;
  /** URL فایل JSON استاتیک نسخه‌دار remote config */
  configUrl?: string;
  /** fetch تزریق‌پذیر برای تست */
  fetchFn?: typeof fetch;
}

/** رابط عمومی کامل پکیج — شامل AnalyticsApi قرارداد + امکانات AI-12 */
export interface DordanehAnalytics {
  /** قرارداد §8: صف آفلاین + ارسال دسته‌ای */
  track(e: AppEvent): void;
  /** قرارداد §8: remote config با کش ۲۴ساعته و fallback همیشگی */
  getRemoteConfig<T>(key: string, fallback: T): T;
  /** A/B قطعی بدون سرور — hash(anonId+experimentId)، توزیع پایدار ۵۰/۵۰ */
  getVariant(experimentId: string): 'A' | 'B';
  /** ارسال فوری صف (برای تست/خروج) */
  flush(): Promise<void>;
  /** قطع تایمر و listener ها */
  dispose(): void;
  /** متادیتای جاری (فقط-خواندنی، برای تست ضد-PII) */
  getMeta(): EventMeta;
}
