import { describe, it, expect, vi } from 'vitest';
import {
  createEventBus,
  createMemoryStorage,
  STORAGE_KEYS,
  type AppEvent,
} from '@dordaneh/contracts';
import { createMetaRetention } from '../src/service';
import { createFixedClock } from '../src/clock';
import { isDordanehDay } from '../src/dordaneh-day';
import type { NotificationGate } from '../src/notifications';
import type { StreakState } from '../src/types';

/** روز غیر-دُردانه و روز دُردانه پیدا کن تا تست‌ها قطعی باشند */
function findDay(dordaneh: boolean, from = 10): number {
  let n = from;
  while (isDordanehDay(n) !== dordaneh) n++;
  return n;
}

function finish(n: number, won = true, guessCount = 3): AppEvent {
  return {
    type: 'puzzle_finished',
    puzzleId: `daily-${n}`,
    won,
    guessCount,
    durationMs: 45_000,
  };
}

function makeGate(overrides: Partial<NotificationGate> = {}): NotificationGate {
  return {
    isAvailable: () => true,
    requestPermission: async () => true,
    schedule: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    ...overrides,
  };
}

function setup(day: number, opts: { golden?: boolean; gate?: NotificationGate } = {}) {
  const bus = createEventBus();
  const storage = createMemoryStorage();
  const clock = createFixedClock(day, 21);
  const meta = createMetaRetention({
    bus,
    storage,
    clock,
    monetization: { isGolden: () => opts.golden === true },
    notifications: opts.gate,
  });
  return { bus, storage, clock, meta };
}

describe('createMetaRetention — سیم‌کشی puzzle_finished', () => {
  it('حل معمای امروز → استریک ۱ و انتشار streak_changed', () => {
    const day = findDay(false);
    const { bus, meta } = setup(day);
    const events: AppEvent[] = [];
    bus.on('streak_changed', (e) => events.push(e));

    bus.emit(finish(day));

    expect(meta.getStreak().current).toBe(1);
    expect(meta.getStats().gamesPlayed).toBe(1);
    expect(meta.getStats().gamesWon).toBe(1);
    expect(events).toEqual([{ type: 'streak_changed', value: 1, frozen: false }]);
  });

  it('روزهای متوالی استریک را می‌سازند و در storage ذخیره می‌شود', () => {
    const day = findDay(false);
    const { bus, storage, clock, meta } = setup(day);
    bus.emit(finish(day));
    clock.setPuzzleNumber(day + 1);
    bus.emit(finish(day + 1));

    expect(meta.getStreak().current).toBe(2);
    const stored = storage.get<StreakState>(STORAGE_KEYS.streak);
    expect(stored?.current).toBe(2);
  });

  it('معمای آرشیوی (puzzleNumber ≠ امروز) استریک/آمار نمی‌سازد', () => {
    const day = findDay(false);
    const { bus, meta } = setup(day);
    bus.emit(finish(day - 5));
    expect(meta.getStreak().current).toBe(0);
    expect(meta.getStats().gamesPlayed).toBe(0);
  });

  it('puzzleId غیر روزانه (practice/duel) نادیده گرفته می‌شود', () => {
    const day = findDay(false);
    const { bus, meta } = setup(day);
    bus.emit({ ...finish(day), puzzleId: 'practice-42' } as AppEvent);
    expect(meta.getStreak().current).toBe(0);
  });

  it('باخت هم استریک می‌سازد (بازی‌کردن مهم است نه بردن) ولی برد نمی‌شمارد', () => {
    const day = findDay(false);
    const { bus, meta } = setup(day);
    bus.emit(finish(day, false, 6));
    expect(meta.getStreak().current).toBe(1);
    expect(meta.getStats().gamesWon).toBe(0);
  });

  it('مصرف فریز → onFreeze صدا می‌خورد و streak_changed با frozen=true', () => {
    const day = findDay(false, 30);
    const { bus, clock, meta } = setup(day);
    // ۷ روز متوالی → یک فریز کسب می‌شود
    for (let i = 0; i < 7; i++) {
      clock.setPuzzleNumber(day + i);
      bus.emit(finish(day + i));
    }
    expect(meta.getStreak().freezes).toBe(1);

    const freezeCb = vi.fn();
    meta.onFreeze(freezeCb);
    const events: AppEvent[] = [];
    bus.on('streak_changed', (e) => events.push(e));

    // یک روز غیبت، روز بعدش بازی
    clock.setPuzzleNumber(day + 8);
    bus.emit(finish(day + 8));

    expect(meta.getStreak().current).toBe(8);
    expect(meta.getStreak().freezes).toBe(0);
    expect(freezeCb).toHaveBeenCalledWith({ consumed: 1, streak: 8 });
    expect(events.at(-1)).toEqual({ type: 'streak_changed', value: 8, frozen: true });
  });

  it('کاربر طلایی بدون فریز هم بعد از غیبت استریکش حفظ می‌شود', () => {
    const day = findDay(false, 50);
    const { bus, clock, meta } = setup(day, { golden: true });
    bus.emit(finish(day));
    clock.setPuzzleNumber(day + 4); // ۳ روز غیبت
    bus.emit(finish(day + 4));
    expect(meta.getStreak().current).toBe(2);
  });

  it('برد در روز دُردانه dordanehDaysWon را افزایش می‌دهد', () => {
    const day = findDay(true);
    const { bus, meta } = setup(day);
    expect(meta.isTodayDordaneh()).toBe(true);
    bus.emit(finish(day));
    expect(meta.getStats().dordanehDaysWon).toBe(1);
  });

  it('دستاورد اولین برد از طریق onAchievements گزارش می‌شود', () => {
    const day = findDay(false);
    const { bus, meta } = setup(day);
    const cb = vi.fn();
    meta.onAchievements(cb);
    bus.emit(finish(day, true, 1)); // برد با یک حدس → first_win + sniper + sharp_eye + lightning
    expect(cb).toHaveBeenCalledTimes(1);
    const ids = (cb.mock.calls[0]![0] as { id: string }[]).map((a) => a.id);
    expect(ids).toContain('first_win');
    expect(ids).toContain('sniper');
  });
});

describe('createMetaRetention — card_revealed و آلبوم', () => {
  it('کشف کارت در روز عادی → عادی؛ در روز دُردانه → طلایی', () => {
    const normal = findDay(false);
    const a = setup(normal);
    a.bus.emit({ type: 'card_revealed', cardId: 'c1' });
    expect(a.meta.getAlbum().discovered['c1']).toBeDefined();
    expect(a.meta.getAlbum().discovered['c1']?.golden).not.toBe(true);

    const dor = findDay(true);
    const b = setup(dor);
    b.bus.emit({ type: 'card_revealed', cardId: 'c1' });
    expect(b.meta.getAlbum().discovered['c1']?.golden).toBe(true);
  });

  it('grantEndowed فقط یک‌بار کارت هدیه می‌دهد', () => {
    const day = findDay(false);
    const { meta } = setup(day);
    const first = meta.grantEndowed(['a', 'b', 'c', 'd']);
    expect(first).toEqual(['a', 'b', 'c']);
    const second = meta.grantEndowed(['x', 'y', 'z']);
    expect(second).toEqual([]);
    expect(Object.keys(meta.getAlbum().discovered)).toHaveLength(3);
  });

  it('مرور فاصله‌دار: کشف امروز → موعد فردا؛ markCardReviewed مرحله را جلو می‌برد', () => {
    const day = findDay(false);
    const { bus, clock, meta } = setup(day);
    bus.emit({ type: 'card_revealed', cardId: 'c1' });
    expect(meta.getDueReviews()).toEqual([]); // هنوز موعدش نرسیده

    clock.setPuzzleNumber(day + 1);
    expect(meta.getDueReviews()).toEqual(['c1']);

    meta.markCardReviewed('c1');
    expect(meta.getDueReviews()).toEqual([]);
    expect(meta.getStats().reviewsDone).toBe(1);

    clock.setPuzzleNumber(day + 4); // فاصله‌ی بعدی = ۳ روز
    expect(meta.getDueReviews()).toEqual(['c1']);
  });

  it('markCardReviewed برای کارت ناموجود بی‌اثر است', () => {
    const day = findDay(false);
    const { meta } = setup(day);
    meta.markCardReviewed('ghost');
    expect(meta.getStats().reviewsDone).toBe(0);
  });
});

describe('createMetaRetention — نوتیفیکیشن مهربان', () => {
  it('بعد از ۳ روز متوالی و اگر نپرسیده باشیم، shouldAsk=true؛ بدون gate هرگز', () => {
    const day = findDay(false, 70);
    const gate = makeGate();
    const { bus, clock, meta } = setup(day, { gate });
    for (let i = 0; i < 3; i++) {
      clock.setPuzzleNumber(day + i);
      bus.emit(finish(day + i));
    }
    expect(meta.shouldAskNotificationPermission()).toBe(true);

    // بدون درگاه در دسترس → false
    const noGate = setup(day, { gate: makeGate({ isAvailable: () => false }) });
    expect(noGate.meta.shouldAskNotificationPermission()).toBe(false);
  });

  it('enableReminders اجازه می‌گیرد، ساعت را ثبت و یادآور فردا را زمان‌بندی می‌کند', async () => {
    const day = findDay(false, 70);
    const gate = makeGate();
    const { bus, clock, meta } = setup(day, { gate });
    for (let i = 0; i < 3; i++) {
      clock.setPuzzleNumber(day + i);
      bus.emit(finish(day + i));
    }
    const ok = await meta.enableReminders();
    expect(ok).toBe(true);
    const notif = meta.getStats().notif;
    expect(notif.enabled).toBe(true);
    expect(notif.asked).toBe(true);
    expect(notif.hour).toBe(21); // میانه‌ی الگوی بازی (همه‌ی حل‌ها ساعت ۲۱)
    expect(gate.schedule).toHaveBeenCalledTimes(1);
  });

  it('رد اجازه → enabled=false و بدون زمان‌بندی؛ دیگر نمی‌پرسیم', async () => {
    const day = findDay(false, 70);
    const gate = makeGate({ requestPermission: async () => false });
    const { meta } = setup(day, { gate });
    const ok = await meta.enableReminders();
    expect(ok).toBe(false);
    expect(meta.getStats().notif.enabled).toBe(false);
    expect(meta.getStats().notif.asked).toBe(true);
    expect(gate.schedule).not.toHaveBeenCalled();
    expect(meta.shouldAskNotificationPermission()).toBe(false);
  });

  it('disableReminders خاموش می‌کند و نوتیف را لغو می‌کند (خاموشی آسان)', async () => {
    const day = findDay(false, 70);
    const gate = makeGate();
    const { meta } = setup(day, { gate });
    await meta.enableReminders();
    await meta.disableReminders();
    expect(meta.getStats().notif.enabled).toBe(false);
    expect(gate.cancel).toHaveBeenCalledWith(8801);
  });

  it('سقف ۱ نوتیف در روز: حل دوم همان روز دوباره زمان‌بندی نمی‌کند', async () => {
    const day = findDay(false, 70);
    const gate = makeGate();
    const { bus, meta } = setup(day, { gate });
    await meta.enableReminders();
    const callsAfterEnable = (gate.schedule as ReturnType<typeof vi.fn>).mock.calls.length;
    bus.emit(finish(day)); // حل امروز → یادآور فردا فقط اگر قبلاً نبوده
    // scheduleReminder داخل then آپدیت می‌شود؛ صبر برای microtaskها
    await Promise.resolve();
    await Promise.resolve();
    bus.emit(finish(day)); // idempotent — نباید نوتیف تازه بسازد
    await Promise.resolve();
    const total = (gate.schedule as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(total).toBeLessThanOrEqual(callsAfterEnable + 1);
  });

  it('markNotifAsked فقط یک‌بار ثبت می‌کند', () => {
    const day = findDay(false);
    const { meta } = setup(day);
    meta.markNotifAsked();
    expect(meta.getStats().notif.asked).toBe(true);
    meta.markNotifAsked(); // بدون خطا و بدون تغییر
    expect(meta.getStats().notif.asked).toBe(true);
  });

  it('getSuggestedReminderHour بدون داده = ۱۹ (پیش‌فرض)', () => {
    const day = findDay(false);
    const { meta } = setup(day);
    expect(meta.getSuggestedReminderHour()).toBe(19);
  });
});

describe('createMetaRetention — چرخه‌ی عمر و پایداری', () => {
  it('dispose شنونده‌ها را جدا می‌کند', () => {
    const day = findDay(false);
    const { bus, meta } = setup(day);
    meta.dispose();
    bus.emit(finish(day));
    expect(meta.getStreak().current).toBe(0);
  });

  it('حالت از storage بازیابی می‌شود (نمونه‌ی دوم همان داده را می‌بیند)', () => {
    const day = findDay(false);
    const bus = createEventBus();
    const storage = createMemoryStorage();
    const clock = createFixedClock(day, 20);
    const m1 = createMetaRetention({ bus, storage, clock });
    bus.emit(finish(day));
    m1.dispose();

    const m2 = createMetaRetention({ bus, storage, clock });
    expect(m2.getStreak().current).toBe(1);
    expect(m2.getStats().gamesPlayed).toBe(1);
  });

  it('monetization پرتاب‌کننده fail-soft است (کاربر عادی فرض می‌شود)', () => {
    const day = findDay(false);
    const bus = createEventBus();
    const storage = createMemoryStorage();
    const clock = createFixedClock(day, 20);
    const meta = createMetaRetention({
      bus,
      storage,
      clock,
      monetization: {
        isGolden: () => {
          throw new Error('boom');
        },
      },
    });
    bus.emit(finish(day));
    expect(meta.getStreak().current).toBe(1);
  });

  it('getEffectiveStreak دیروزِ بازی‌شده با فریز موجود را زنده نشان می‌دهد', () => {
    const day = findDay(false, 90);
    const { bus, clock, meta } = setup(day);
    for (let i = 0; i < 7; i++) {
      clock.setPuzzleNumber(day + i);
      bus.emit(finish(day + i));
    }
    clock.setPuzzleNumber(day + 8); // یک روز غیبت — فریز داریم
    expect(meta.getEffectiveStreak()).toBe(7);
  });
});
