import { describe, expect, it } from 'vitest';
import {
  createInitialStats,
  DEFAULT_REMINDER_HOUR,
  NOTIF_ASK_STREAK,
  recordResult,
  sanitizeStats,
  shouldAskNotifPermission,
  suggestedReminderHour,
  winRate,
} from '../src/stats';

describe('recordResult', () => {
  it('برد → gamesWon و هیستوگرام و winsInRow', () => {
    let s = createInitialStats();
    s = recordResult(s, { puzzleNumber: 10, won: true, guessCount: 3 }, 20);
    expect(s.gamesPlayed).toBe(1);
    expect(s.gamesWon).toBe(1);
    expect(s.guessDist[2]).toBe(1);
    expect(s.winsInRow).toBe(1);
    expect(s.lastResult?.puzzleNumber).toBe(10);
    expect(s.playHours).toEqual([20]);
  });

  it('باخت → winsInRow صفر می‌شود و هیستوگرام دست نمی‌خورد', () => {
    let s = createInitialStats();
    s = recordResult(s, { puzzleNumber: 10, won: true, guessCount: 2 }, 9);
    s = recordResult(s, { puzzleNumber: 11, won: false, guessCount: 6 }, 9);
    expect(s.winsInRow).toBe(0);
    expect(s.gamesWon).toBe(1);
    expect(s.guessDist).toEqual([0, 1, 0, 0, 0, 0]);
  });

  it('idempotent: همان puzzleNumber دوبار شمرده نمی‌شود', () => {
    let s = createInitialStats();
    s = recordResult(s, { puzzleNumber: 10, won: true, guessCount: 1 }, 8);
    const again = recordResult(s, { puzzleNumber: 10, won: true, guessCount: 1 }, 8);
    expect(again).toBe(s);
    expect(again.gamesPlayed).toBe(1);
  });

  it('guessCount خارج از بازه clamp می‌شود', () => {
    let s = createInitialStats();
    s = recordResult(s, { puzzleNumber: 1, won: true, guessCount: 0 }, 8);
    s = recordResult(s, { puzzleNumber: 2, won: true, guessCount: 9 }, 8);
    expect(s.guessDist[0]).toBe(1);
    expect(s.guessDist[5]).toBe(1);
  });

  it('playHours و playedPuzzles محدود می‌مانند (بدون رشد بی‌نهایت)', () => {
    let s = createInitialStats();
    for (let i = 1; i <= 450; i++) {
      s = recordResult(s, { puzzleNumber: i, won: true, guessCount: 4 }, i % 24);
    }
    expect(s.playHours.length).toBeLessThanOrEqual(20);
    expect(s.playedPuzzles.length).toBeLessThanOrEqual(400);
    expect(s.gamesPlayed).toBe(450);
  });
});

describe('winRate', () => {
  it('بدون بازی → ۰ (نه NaN)', () => {
    expect(winRate(createInitialStats())).toBe(0);
  });
  it('گرد کردن درست', () => {
    let s = createInitialStats();
    s = recordResult(s, { puzzleNumber: 1, won: true, guessCount: 3 }, 8);
    s = recordResult(s, { puzzleNumber: 2, won: true, guessCount: 3 }, 8);
    s = recordResult(s, { puzzleNumber: 3, won: false, guessCount: 6 }, 8);
    expect(winRate(s)).toBe(67);
  });
});

describe('suggestedReminderHour — trigger شخصی‌سازی‌شده', () => {
  it('بدون سابقه → پیش‌فرض ۱۹', () => {
    expect(suggestedReminderHour(createInitialStats())).toBe(DEFAULT_REMINDER_HOUR);
  });
  it('میانه‌ی فرد', () => {
    const s = { ...createInitialStats(), playHours: [8, 21, 22] };
    expect(suggestedReminderHour(s)).toBe(21);
  });
  it('میانه‌ی زوج (میانگینِ دو وسط، گرد)', () => {
    const s = { ...createInitialStats(), playHours: [8, 10, 20, 22] };
    expect(suggestedReminderHour(s)).toBe(15);
  });
});

describe('shouldAskNotifPermission — لحظه‌ی درست، فقط یک‌بار', () => {
  it('قبل از ۳ روز استریک نمی‌پرسد', () => {
    expect(shouldAskNotifPermission(createInitialStats(), NOTIF_ASK_STREAK - 1)).toBe(false);
  });
  it('در ۳ روز استریک می‌پرسد', () => {
    expect(shouldAskNotifPermission(createInitialStats(), NOTIF_ASK_STREAK)).toBe(true);
  });
  it('اگر قبلاً پرسیده → دیگر نمی‌پرسد', () => {
    const s = createInitialStats();
    s.notif.asked = true;
    expect(shouldAskNotifPermission(s, 10)).toBe(false);
  });
  it('اگر روشن است → نمی‌پرسد', () => {
    const s = createInitialStats();
    s.notif.enabled = true;
    expect(shouldAskNotifPermission(s, 10)).toBe(false);
  });
});

describe('sanitizeStats — fail-soft', () => {
  it('ورودی خراب → اولیه', () => {
    expect(sanitizeStats(null)).toEqual(createInitialStats());
    expect(sanitizeStats(42)).toEqual(createInitialStats());
  });
  it('guessDist کوتاه/خراب → شش‌تایی امن', () => {
    const s = sanitizeStats({ guessDist: [1, 'x'] });
    expect(s.guessDist).toEqual([1, 0, 0, 0, 0, 0]);
  });
  it('playHours خارج از بازه فیلتر می‌شود', () => {
    const s = sanitizeStats({ playHours: [5, -1, 30, 23] });
    expect(s.playHours).toEqual([5, 23]);
  });
  it('notif ناقص → پیش‌فرض‌های امن', () => {
    const s = sanitizeStats({ notif: { enabled: 'yes', hour: 99 } });
    expect(s.notif.enabled).toBe(false);
    expect(s.notif.hour).toBeNull();
    expect(s.notif.asked).toBe(false);
  });
  it('state سالم round-trip می‌شود', () => {
    let v = createInitialStats();
    v = recordResult(v, { puzzleNumber: 5, won: true, guessCount: 4 }, 18);
    expect(sanitizeStats(JSON.parse(JSON.stringify(v)))).toEqual(v);
  });
});
