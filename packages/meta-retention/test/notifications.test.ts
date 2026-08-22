import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createCapacitorGate,
  createNoopGate,
  nextReminderAt,
  reminderMessageIndex,
  REMINDER_MESSAGE_COUNT,
  REMINDER_NOTIFICATION_ID,
} from '../src/notifications';
import { createFixedClock, createSystemClock, tehranHourForDate } from '../src/clock';
import { sanitizeStats } from '../src/stats';
import { t, messages } from '../src/i18n';
import type { StatsState } from '../src/types';

type GlobalWithCap = typeof globalThis & { Capacitor?: unknown };

afterEach(() => {
  delete (globalThis as GlobalWithCap).Capacitor;
});

function statsWith(over: Partial<StatsState['notif']>, playHours: number[] = []): StatsState {
  const base = sanitizeStats(null);
  return { ...base, playHours, notif: { ...base.notif, ...over } };
}

describe('reminderMessageIndex', () => {
  it('چرخشی و قطعی است و همیشه در بازه‌ی معتبر', () => {
    for (let n = 0; n < 20; n++) {
      const idx = reminderMessageIndex(n);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(REMINDER_MESSAGE_COUNT);
      expect(reminderMessageIndex(n)).toBe(idx); // قطعی
    }
    expect(reminderMessageIndex(-1)).toBeGreaterThanOrEqual(0); // ورودی منفی هم امن
  });

  it('همه‌ی متن‌های چرخشی در locale موجودند', () => {
    for (let i = 0; i < REMINDER_MESSAGE_COUNT; i++) {
      const msg = t(`metaRetention.notif.msg${i}`, { streak: '۵' });
      expect(msg).not.toBe(`metaRetention.notif.msg${i}`); // کلید نباید خام برگردد
    }
    expect(messages['metaRetention.notif.title']).toBeTruthy();
  });
});

describe('nextReminderAt', () => {
  it('نوتیف خاموش → null', () => {
    const clock = createFixedClock(100, 20);
    expect(nextReminderAt(statsWith({ enabled: false }), clock)).toBeNull();
  });

  it('قبلاً برای فردا زمان‌بندی شده → null (سقف ۱ نوتیف/روز)', () => {
    const clock = createFixedClock(100, 20);
    const stats = statsWith({ enabled: true, lastScheduledFor: 101 });
    expect(nextReminderAt(stats, clock)).toBeNull();
  });

  it('ساعت ذخیره‌شده اولویت دارد؛ وگرنه میانه‌ی الگوی بازی', () => {
    const clock = createFixedClock(100, 20);
    const withHour = nextReminderAt(statsWith({ enabled: true, hour: 8 }), clock);
    expect(withHour?.hour).toBe(8);
    expect(withHour?.forPuzzleNumber).toBe(101);
    expect(withHour?.at.getHours()).toBe(8);

    const fromPattern = nextReminderAt(
      statsWith({ enabled: true, hour: null }, [22, 22, 23]),
      clock,
    );
    expect(fromPattern?.hour).toBe(22); // میانه
  });
});

describe('createNoopGate', () => {
  it('همیشه غیرفعال و بی‌اثر است', async () => {
    const gate = createNoopGate();
    expect(gate.isAvailable()).toBe(false);
    expect(await gate.requestPermission()).toBe(false);
    await expect(gate.schedule({ id: 1, title: 't', body: 'b', at: new Date() })).resolves.toBeUndefined();
    await expect(gate.cancel(1)).resolves.toBeUndefined();
  });
});

describe('createCapacitorGate — تشخیص محیط', () => {
  it('بدون Capacitor: در دسترس نیست و همه‌چیز fail-soft است', async () => {
    const gate = createCapacitorGate();
    expect(gate.isAvailable()).toBe(false);
    expect(await gate.requestPermission()).toBe(false);
    await expect(gate.schedule({ id: 1, title: 't', body: 'b', at: new Date() })).resolves.toBeUndefined();
    await expect(gate.cancel(1)).resolves.toBeUndefined();
  });

  it('isPluginAvailable=false → در دسترس نیست', () => {
    (globalThis as GlobalWithCap).Capacitor = {
      isPluginAvailable: () => false,
      Plugins: { LocalNotifications: {} },
    };
    expect(createCapacitorGate().isAvailable()).toBe(false);
  });

  it('پلاگین موجود: اجازه/زمان‌بندی/لغو به پلاگین می‌رسد', async () => {
    const plugin = {
      requestPermissions: vi.fn(async () => ({ display: 'granted' })),
      schedule: vi.fn(async () => ({})),
      cancel: vi.fn(async () => ({})),
    };
    (globalThis as GlobalWithCap).Capacitor = {
      isPluginAvailable: () => true,
      Plugins: { LocalNotifications: plugin },
    };
    const gate = createCapacitorGate();
    expect(gate.isAvailable()).toBe(true);
    expect(await gate.requestPermission()).toBe(true);

    const at = new Date();
    await gate.schedule({ id: REMINDER_NOTIFICATION_ID, title: 'عنوان', body: 'متن', at });
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [
        { id: REMINDER_NOTIFICATION_ID, title: 'عنوان', body: 'متن', schedule: { at } },
      ],
    });

    await gate.cancel(REMINDER_NOTIFICATION_ID);
    expect(plugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: REMINDER_NOTIFICATION_ID }],
    });
  });

  it('اجازه‌ی ردشده یا پلاگین پرتاب‌کننده → false بدون کرش', async () => {
    (globalThis as GlobalWithCap).Capacitor = {
      Plugins: {
        LocalNotifications: {
          requestPermissions: async () => ({ display: 'denied' }),
          schedule: async () => {
            throw new Error('boom');
          },
          cancel: async () => {
            throw new Error('boom');
          },
        },
      },
    };
    const gate = createCapacitorGate();
    expect(await gate.requestPermission()).toBe(false);
    await expect(gate.schedule({ id: 1, title: 't', body: 'b', at: new Date() })).resolves.toBeUndefined();
    await expect(gate.cancel(1)).resolves.toBeUndefined();
  });
});

describe('clock', () => {
  it('createSystemClock با قرارداد سازگار است', () => {
    const clock = createSystemClock();
    expect(typeof clock.now()).toBe('number');
    expect(Number.isInteger(clock.puzzleNumber())).toBe(true);
    const h = clock.tehranHour();
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
  });

  it('tehranHourForDate: نیمه‌شب تهران هرگز ۲۴ برنمی‌گردد', () => {
    // 2026-09-01T20:30:00Z = نیمه‌شب تهران (UTC+3:30)
    expect(tehranHourForDate(new Date('2026-09-01T20:30:00Z'))).toBe(0);
    expect(tehranHourForDate(new Date('2026-09-01T08:30:00Z'))).toBe(12);
  });

  it('createFixedClock: setNow/setHour/setPuzzleNumber اثر می‌کنند', () => {
    const c = createFixedClock(5, 9, 1000);
    expect(c.now()).toBe(1000);
    expect(c.tehranHour()).toBe(9);
    c.setNow(2000);
    c.setHour(23);
    c.setPuzzleNumber(6);
    expect(c.now()).toBe(2000);
    expect(c.tehranHour()).toBe(23);
    expect(c.puzzleNumber()).toBe(6);
  });
});
