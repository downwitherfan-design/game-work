import { beforeEach, describe, expect, it } from 'vitest';
import type { AppEvent, EventBus } from '@dordaneh/contracts';
import { createEventBus } from '@dordaneh/contracts';
import { createBoardController, type BoardController } from '../src/logic/controller';
import { createMockEngine } from '../src/mocks/mock-engine';
import { createMockAudio } from '../src/mocks/mock-audio';

/** زمان‌بند دستی — کنترل کامل زمان در تست */
function createFakeScheduler() {
  const queue: { fn: () => void; at: number }[] = [];
  let now = 0;
  return {
    schedule(fn: () => void, ms: number): void {
      queue.push({ fn, at: now + ms });
    },
    /** پیشروی زمان و اجرای کارهای سررسیده به ترتیب */
    advance(ms: number): void {
      now += ms;
      // هر بار مرتب‌سازی مجدد: کارهایی که حین اجرا اضافه می‌شوند هم دیده شوند
      for (;;) {
        queue.sort((a, b) => a.at - b.at);
        if (!queue.length || queue[0]!.at > now) break;
        const job = queue.shift()!;
        job.fn();
      }
    },
    flushAll(): void {
      // کارهای جدیدی که حین اجرا زمان‌بندی می‌شوند هم باید اجرا شوند
      let guard = 0;
      while (queue.length && guard++ < 50) this.advance(1e9);
    },
  };
}

interface Ctx {
  controller: BoardController;
  bus: EventBus;
  events: AppEvent[];
  audio: ReturnType<typeof createMockAudio>;
  sched: ReturnType<typeof createFakeScheduler>;
  solution: string;
}

function setup(opts?: { reducedMotion?: boolean; freeHintQuota?: number }): Ctx {
  const engine = createMockEngine();
  const audio = createMockAudio();
  const bus = createEventBus();
  const events: AppEvent[] = [];
  for (const t of [
    'puzzle_started',
    'guess_submitted',
    'puzzle_finished',
    'reward_ad_requested',
  ] as const) {
    bus.on(t, (e) => events.push(e));
  }
  const sched = createFakeScheduler();
  const daily = engine.getDailyPuzzle(1); // جواب قطعی: ANSWERS_6[1] = 'ایرانی'
  const controller = createBoardController({
    engine,
    audio,
    bus,
    mode: 'daily',
    puzzleId: daily.puzzleId,
    wordLength: daily.wordLength,
    schedule: (fn, ms) => sched.schedule(fn, ms),
    reducedMotion: opts?.reducedMotion ?? false,
    freeHintQuota: opts?.freeHintQuota ?? 1,
  });
  return { controller, bus, events, audio, sched, solution: 'ایرانی' };
}

function typeWord(c: BoardController, word: string): void {
  for (const ch of word) c.typeLetter(ch);
}

describe('کنترلر برد — تایپ', () => {
  let ctx: Ctx;
  beforeEach(() => {
    ctx = setup();
  });

  it('در شروع بازیِ تازه puzzle_started منتشر می‌شود', () => {
    expect(ctx.events.some((e) => e.type === 'puzzle_started')).toBe(true);
  });

  it('تایپ حرف: current بزرگ می‌شود + صدای tap + هپتیک light', () => {
    ctx.controller.typeLetter('د');
    const s = ctx.controller.getState();
    expect(s.current).toBe('د');
    expect(s.lastTypedIndex).toBe(0);
    expect(ctx.audio.log.played).toContain('tap');
    expect(ctx.audio.log.haptics).toContain('light');
  });

  it('بیش از wordLength حرف پذیرفته نمی‌شود', () => {
    typeWord(ctx.controller, 'ایرانیا');
    expect([...ctx.controller.getState().current]).toHaveLength(6);
  });

  it('backspace حرف آخر را حذف می‌کند و روی رشته‌ی خالی امن است', () => {
    ctx.controller.typeLetter('د');
    ctx.controller.backspace();
    expect(ctx.controller.getState().current).toBe('');
    ctx.controller.backspace(); // خالی — نباید خطا بدهد
    expect(ctx.controller.getState().current).toBe('');
  });
});

describe('کنترلر برد — ثبت حدس', () => {
  let ctx: Ctx;
  beforeEach(() => {
    ctx = setup();
  });

  it('حدس کوتاه: shake + toast بدون جریمه (حدسی مصرف نمی‌شود)', () => {
    typeWord(ctx.controller, 'ایر');
    ctx.controller.submit();
    const s = ctx.controller.getState();
    expect(s.shakeRow).toBe(0);
    expect(s.toast?.text).toBe('WRONG_LENGTH:6');
    expect(s.guesses).toHaveLength(0);
    expect(s.current).toBe('ایر'); // ورودی حفظ می‌شود — خطا ارزان است
    expect(ctx.audio.log.haptics).toContain('error');
    ctx.sched.flushAll();
    expect(ctx.controller.getState().shakeRow).toBeNull();
  });

  it('کلمه‌ی ناموجود: INVALID_WORD + shake، بدون مصرف حدس', () => {
    typeWord(ctx.controller, 'ببببببب'.slice(0, 6));
    ctx.controller.submit();
    const s = ctx.controller.getState();
    expect(s.toast?.text).toBe('INVALID_WORD');
    expect(s.guesses).toHaveLength(0);
  });

  it('حدس معتبر: reveal پلکانی + قفل ورودی + صداهای flip/state', () => {
    typeWord(ctx.controller, 'دوستان');
    ctx.controller.submit();
    let s = ctx.controller.getState();
    expect(s.phase).toBe('revealing');
    expect(s.revealingRow).toBe(0);
    expect(s.guesses).toHaveLength(1);
    expect(ctx.events.some((e) => e.type === 'guess_submitted')).toBe(true);

    // در حین reveal ورودی قفل است
    ctx.controller.typeLetter('د');
    expect(ctx.controller.getState().current).toBe('');

    // پیشروی تا اولین کاشی
    ctx.sched.advance(300);
    s = ctx.controller.getState();
    expect(s.revealedTiles).toBeGreaterThanOrEqual(1);
    expect(ctx.audio.log.played).toContain('flip');

    ctx.sched.flushAll();
    s = ctx.controller.getState();
    expect(s.phase).toBe('typing');
    expect(s.revealingRow).toBeNull();
  });

  it('برد: puzzle_finished(won) + صدای win + مودال پس از تأخیر', () => {
    typeWord(ctx.controller, ctx.solution);
    ctx.controller.submit();
    ctx.sched.flushAll();
    const s = ctx.controller.getState();
    expect(s.phase).toBe('won');
    expect(s.resultOpen).toBe(true);
    const fin = ctx.events.find((e) => e.type === 'puzzle_finished');
    expect(fin).toMatchObject({ won: true, guessCount: 1 });
    expect(ctx.audio.log.played).toContain('win');
    expect(ctx.audio.log.haptics).toContain('success');
  });

  it('باخت پس از ۶ حدس غلط: puzzle_finished(won:false) + جواب نمایان', () => {
    for (let i = 0; i < 6; i++) {
      typeWord(ctx.controller, 'دوستان');
      ctx.controller.submit();
      ctx.sched.flushAll();
    }
    const s = ctx.controller.getState();
    expect(s.phase).toBe('lost');
    expect(s.solution).toBe(ctx.solution);
    const fin = ctx.events.find((e) => e.type === 'puzzle_finished');
    expect(fin).toMatchObject({ won: false, guessCount: 6 });
    expect(ctx.audio.log.played).toContain('lose');
  });

  it('پس از پایان بازی submit/type بی‌اثرند', () => {
    typeWord(ctx.controller, ctx.solution);
    ctx.controller.submit();
    ctx.sched.flushAll();
    ctx.controller.typeLetter('د');
    ctx.controller.submit();
    expect(ctx.controller.getState().guesses).toHaveLength(1);
  });
});

describe('کنترلر برد — reduced motion', () => {
  it('بدون انیمیشن: رنگ‌ها فوری و بدون فاز revealing', () => {
    const ctx = setup({ reducedMotion: true });
    typeWord(ctx.controller, 'دوستان');
    ctx.controller.submit();
    const s = ctx.controller.getState();
    expect(s.phase).toBe('typing'); // بلافاصله برگشت
    expect(s.revealedTiles).toBe(6);
    expect(s.revealingRow).toBeNull();
  });

  it('برد با reduced motion: مودال بدون تأخیر باز می‌شود', () => {
    const ctx = setup({ reducedMotion: true });
    typeWord(ctx.controller, ctx.solution);
    ctx.controller.submit();
    ctx.sched.advance(0);
    expect(ctx.controller.getState().resultOpen).toBe(true);
  });
});

describe('کنترلر برد — راهنما', () => {
  it('راهنمای رایگان: حرف و جایگاه از موتور + صدای پاداش', () => {
    const ctx = setup();
    ctx.controller.requestHint();
    const s = ctx.controller.getState();
    expect(s.hint).not.toBeNull();
    expect(s.hint!.letter).toBe('ا'); // اولین حرف حل‌نشده‌ی «ایرانی»
    expect(s.hint!.position).toBe(0);
    expect(s.hintsUsed).toBe(1);
    expect(ctx.audio.log.haptics).toContain('success');
  });

  it('سهمیه تمام → reward_ad_requested + حالت loading', () => {
    const ctx = setup({ freeHintQuota: 0 });
    ctx.controller.requestHint();
    const s = ctx.controller.getState();
    expect(s.hintLoading).toBe(true);
    const ev = ctx.events.find((e) => e.type === 'reward_ad_requested');
    expect(ev).toMatchObject({ placement: 'hint' });
  });

  it('grantExtraHint پس از تبلیغ: راهنما داده و loading برداشته می‌شود', () => {
    const ctx = setup({ freeHintQuota: 0 });
    ctx.controller.requestHint();
    ctx.controller.grantExtraHint();
    const s = ctx.controller.getState();
    expect(s.hintLoading).toBe(false);
    expect(s.hint).not.toBeNull();
  });
});

describe('کنترلر برد — subscribe/مودال/toast', () => {
  it('subscribe با هر تغییر صدا زده و unsubscribe کار می‌کند', () => {
    const ctx = setup();
    let calls = 0;
    const off = ctx.controller.subscribe(() => calls++);
    ctx.controller.typeLetter('د');
    expect(calls).toBeGreaterThan(0);
    const before = calls;
    off();
    ctx.controller.typeLetter('ر');
    expect(calls).toBe(before);
  });

  it('باز/بستن مودال و dismissToast', () => {
    const ctx = setup();
    ctx.controller.openResult();
    expect(ctx.controller.getState().resultOpen).toBe(true);
    ctx.controller.closeResult();
    expect(ctx.controller.getState().resultOpen).toBe(false);

    typeWord(ctx.controller, 'ایر');
    ctx.controller.submit();
    expect(ctx.controller.getState().toast).not.toBeNull();
    ctx.controller.dismissToast();
    expect(ctx.controller.getState().toast).toBeNull();
  });

  it('toast پس از TIMINGS.toastMs خودش محو می‌شود', () => {
    const ctx = setup();
    typeWord(ctx.controller, 'ایر');
    ctx.controller.submit();
    expect(ctx.controller.getState().toast).not.toBeNull();
    ctx.sched.advance(3000);
    expect(ctx.controller.getState().toast).toBeNull();
  });
});

describe('کنترلر برد — بازیابی وضعیت (آفلاین-اول)', () => {
  it('کنترلر دوم روی همان معما، حدس‌های قبلی را بازیابی می‌کند', () => {
    const engine = createMockEngine();
    const daily = engine.getDailyPuzzle(1);
    const audio = createMockAudio();
    const bus = createEventBus();
    const sched = createFakeScheduler();
    const mk = () =>
      createBoardController({
        engine,
        audio,
        bus,
        mode: 'daily',
        puzzleId: daily.puzzleId,
        wordLength: daily.wordLength,
        schedule: (fn, ms) => sched.schedule(fn, ms),
      });

    const c1 = mk();
    typeWord(c1, 'دوستان');
    c1.submit();
    sched.flushAll();

    const c2 = mk(); // شبیه‌سازی refresh
    const s2 = c2.getState();
    expect(s2.guesses).toHaveLength(1);
    expect(s2.phase).toBe('typing');
  });

  it('بازیابی بازیِ تمام‌شده: فاز won و مودال باز', () => {
    const engine = createMockEngine();
    const daily = engine.getDailyPuzzle(1);
    const audio = createMockAudio();
    const bus = createEventBus();
    const sched = createFakeScheduler();
    const mk = () =>
      createBoardController({
        engine,
        audio,
        bus,
        mode: 'daily',
        puzzleId: daily.puzzleId,
        wordLength: daily.wordLength,
        schedule: (fn, ms) => sched.schedule(fn, ms),
      });

    const c1 = mk();
    typeWord(c1, 'ایرانی');
    c1.submit();
    sched.flushAll();

    const c2 = mk();
    expect(c2.getState().phase).toBe('won');
    expect(c2.getState().resultOpen).toBe(true);
  });
});
