/**
 * نوتیفیکیشن یادآور «مهربان» — فقط زمان‌بندی محلی (Capacitor Local Notifications
 * از طریق آداپتور با تشخیص محیط؛ پیکربندی native مال AI-14 است).
 *
 * اصول:
 *  - پیش‌فرض: خاموش. بعد از ۳ روز بازی متوالی اجازه می‌خواهیم (لحظه‌ی درست).
 *  - ساعت از الگوی بازی خود کاربر (میانه) — trigger شخصی‌سازی‌شده (Eyal 2014).
 *  - هرگز بیش از ۱ نوتیف در روز. خاموش‌کردن آسان.
 *  - متن‌های چرخشی گرم از locale — قطعی بر اساس puzzleNumber.
 */
import type { Clock, StatsState } from './types';
import { suggestedReminderHour } from './stats';

/** درگاه انتزاعی نوتیفیکیشن — پیاده‌سازی Capacitor فقط وقتی native موجود است */
export interface NotificationGate {
  isAvailable(): boolean;
  requestPermission(): Promise<boolean>;
  /** زمان‌بندی یک نوتیف محلی؛ id ثابت = جایگزینی (نه انباشت) */
  schedule(opts: { id: number; title: string; body: string; at: Date }): Promise<void>;
  cancel(id: number): Promise<void>;
}

/** id ثابت نوتیف یادآور روزانه — همیشه جایگزین می‌شود (سقف ۱ نوتیف/روز) */
export const REMINDER_NOTIFICATION_ID = 8801;

/** تعداد متن‌های چرخشی در locale: metaRetention.notif.msg0..msg{N-1} */
export const REMINDER_MESSAGE_COUNT = 4;

/** ایندکس پیام امروز — چرخشی و قطعی */
export function reminderMessageIndex(puzzleNumber: number): number {
  return ((puzzleNumber % REMINDER_MESSAGE_COUNT) + REMINDER_MESSAGE_COUNT) % REMINDER_MESSAGE_COUNT;
}

/**
 * آداپتور Capacitor با تشخیص محیط — بدون import استاتیک از پکیج native
 * (پلاگین را از window.Capacitor کشف می‌کند؛ در وب/دو mock امن است).
 */
interface CapacitorLike {
  isPluginAvailable?(name: string): boolean;
  Plugins?: Record<string, unknown>;
}

interface LocalNotificationsLike {
  requestPermissions(): Promise<{ display: string }>;
  schedule(opts: { notifications: unknown[] }): Promise<unknown>;
  cancel(opts: { notifications: { id: number }[] }): Promise<unknown>;
}

function detectPlugin(): LocalNotificationsLike | null {
  const g = globalThis as { Capacitor?: CapacitorLike };
  const cap = g.Capacitor;
  if (!cap) return null;
  if (cap.isPluginAvailable && !cap.isPluginAvailable('LocalNotifications')) return null;
  const plugin = cap.Plugins?.['LocalNotifications'];
  return plugin ? (plugin as LocalNotificationsLike) : null;
}

export function createCapacitorGate(): NotificationGate {
  return {
    isAvailable: () => detectPlugin() !== null,
    async requestPermission(): Promise<boolean> {
      const p = detectPlugin();
      if (!p) return false;
      try {
        const res = await p.requestPermissions();
        return res.display === 'granted';
      } catch {
        return false; // fail-soft — نوتیف هرگز اپ را نمی‌شکند
      }
    },
    async schedule(opts): Promise<void> {
      const p = detectPlugin();
      if (!p) return;
      try {
        await p.schedule({
          notifications: [
            { id: opts.id, title: opts.title, body: opts.body, schedule: { at: opts.at } },
          ],
        });
      } catch {
        /* fail-soft */
      }
    },
    async cancel(id): Promise<void> {
      const p = detectPlugin();
      if (!p) return;
      try {
        await p.cancel({ notifications: [{ id }] });
      } catch {
        /* fail-soft */
      }
    },
  };
}

/** درگاه بی‌اثر برای وب/تست */
export function createNoopGate(): NotificationGate {
  return {
    isAvailable: () => false,
    requestPermission: async () => false,
    schedule: async () => undefined,
    cancel: async () => undefined,
  };
}

/**
 * زمان یادآور فردا: ساعتِ ذخیره‌شده یا میانه‌ی الگوی بازی کاربر.
 * خروجی null = امروز قبلاً زمان‌بندی شده (سقف ۱ نوتیف/روز) یا خاموش.
 */
export function nextReminderAt(
  stats: StatsState,
  clock: Clock,
): { at: Date; hour: number; forPuzzleNumber: number } | null {
  if (!stats.notif.enabled) return null;
  const tomorrow = clock.puzzleNumber() + 1;
  if (stats.notif.lastScheduledFor !== null && stats.notif.lastScheduledFor >= tomorrow) return null;
  const hour = stats.notif.hour ?? suggestedReminderHour(stats);
  // فردا در ساعتِ hour (به وقت دستگاه — تقریب کافی برای یادآور محلی)
  const at = new Date(clock.now());
  at.setDate(at.getDate() + 1);
  at.setHours(hour, 0, 0, 0);
  return { at, hour, forPuzzleNumber: tomorrow };
}
