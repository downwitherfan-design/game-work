import { describe, expect, it } from 'vitest';
import { createMemoryStorage, STORAGE_KEYS, type PuzzleState } from '@dordaneh/contracts';
import {
  buildResultGridText,
  createMockAnalytics,
  createMockAudio,
  createMockCulture,
  createMockMonetization,
  createMockShare,
} from '../src/mocks/services.mock';

describe('MockCulture — قرارداد CultureApi', () => {
  it('برای هر شماره‌ی معما کارت معتبر با source می‌دهد', () => {
    const c = createMockCulture(createMemoryStorage());
    for (const n of [0, 1, 2, 3, 100, -1]) {
      const card = c.getCardForPuzzle(n, 'x');
      expect(card.id).toBeTruthy();
      expect(card.source).toBeTruthy(); // خط قرمز ۳۰: منبع اجباری
      expect(card.shareCaption.length).toBeLessThanOrEqual(140);
      expect((card.explanation ?? '').length).toBeLessThanOrEqual(220);
    }
  });

  it('getAlbum فقط کارت‌های کشف‌شده را برمی‌گرداند', () => {
    const storage = createMemoryStorage();
    const c = createMockCulture(storage);
    expect(c.getAlbum().cards).toHaveLength(0);
    expect(c.getAlbum().total).toBeGreaterThan(0);
    const card = c.getCardForPuzzle(0, 'x');
    storage.set(STORAGE_KEYS.album, [card.id]);
    expect(c.getAlbum().cards.map((x) => x.id)).toEqual([card.id]);
  });
});

describe('MockAudio — قرارداد AudioApi', () => {
  it('همه‌ی متدها بدون خطا', () => {
    const a = createMockAudio();
    expect(() => {
      a.play('win');
      a.setSfxEnabled(false);
      a.setMusicEnabled(true);
      a.haptic('success');
    }).not.toThrow();
  });
});

describe('MockAnalytics — صف آفلاین', () => {
  it('track در صف Storage می‌نویسد و سقف ۵۰۰ دارد', () => {
    const storage = createMemoryStorage();
    const a = createMockAnalytics(storage);
    for (let i = 0; i < 510; i++) a.track({ type: 'screen_viewed', screen: `/${i}` });
    const q = storage.get<unknown[]>(STORAGE_KEYS.analyticsQueue);
    expect(q).toHaveLength(500);
  });

  it('getRemoteConfig فالبک می‌دهد', () => {
    const a = createMockAnalytics(createMemoryStorage());
    expect(a.getRemoteConfig('k', 42)).toBe(42);
  });
});

describe('MockMonetization — قرارداد §10', () => {
  it('rewarded/ok طبق قرارداد وب/دِو', async () => {
    const m = createMockMonetization(createMemoryStorage());
    await expect(m.showRewardedAd('hint')).resolves.toBe('rewarded');
    await expect(m.purchase('golden')).resolves.toBe('ok');
  });

  it('purchase مالکیت را ثبت می‌کند؛ isGolden درست', async () => {
    const m = createMockMonetization(createMemoryStorage());
    expect(m.isGolden()).toBe(false);
    expect(m.ownsSku('pack_cinema')).toBe(false);
    await m.purchase('golden');
    await m.purchase('golden'); // idempotent
    expect(m.isGolden()).toBe(true);
  });
});

describe('MockShare — گرید بی‌اسپویلر', () => {
  const state: PuzzleState = {
    puzzleId: 'daily-812',
    wordLength: 3,
    maxGuesses: 6,
    status: 'won',
    hintsUsed: 0,
    startedAt: 0,
    finishedAt: 1,
    guesses: [
      { guess: 'الف', states: ['absent', 'present', 'correct'] },
      { guess: 'الف', states: ['correct', 'correct', 'correct'] },
    ],
  };

  it('گرید ایموجی بدون اسپویلر (بدون حروف) + شماره فارسی', () => {
    const grid = buildResultGridText(state);
    expect(grid).toContain('دُردانه');
    expect(grid).toContain('#۸۱۲');
    expect(grid).toContain('۲/۶');
    expect(grid).toContain('⬜🟨🟩');
    expect(grid).toContain('🟩🟩🟩');
    expect(grid).not.toContain('الف'); // بی-اسپویلر
  });

  it('باخت → X/۶', () => {
    const grid = buildResultGridText({ ...state, status: 'lost' });
    expect(grid).toContain('X/۶');
  });

  it('shareResult بدون navigator.share → clipboard یا silent', async () => {
    const s = createMockShare();
    await expect(s.shareResult(state)).resolves.toBeUndefined();
  });

  it('buildInviteLink دیپ‌لینک درست', () => {
    const s = createMockShare();
    expect(s.buildInviteLink('duel', 'abc')).toBe('https://dordaneh.ir/d/duel/abc');
    expect(s.buildInviteLink('circle', 'z9')).toBe('https://dordaneh.ir/d/circle/z9');
  });
});
