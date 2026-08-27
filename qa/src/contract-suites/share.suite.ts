/**
 * @dordaneh/qa — suite قرارداد ShareApi (docs/02_CONTRACTS.md §12)
 * حیاتی‌ترین assert: گرید نتیجه هرگز اسپویلر ندارد (هیچ حرفی از جواب در خروجی).
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeFa,
  toPersianDigits,
  type PuzzleState,
  type ShareApi,
} from '@dordaneh/contracts';
import { evaluateOracle, toChars } from '../oracle';

export interface ShareSuiteFixture {
  makeShare: () => ShareApi;
}

/** ساخت PuzzleState واقع‌گرایانه برای تست (برد در ۳ حدس روی معمای ۸۱۲) */
export function buildWonState(solution: string, guesses: readonly string[]): PuzzleState {
  const sol = normalizeFa(solution);
  const evals = guesses.map((g) => ({
    guess: normalizeFa(g),
    states: evaluateOracle(sol, g),
  }));
  const won = evals[evals.length - 1]?.states.every((s) => s === 'correct') ?? false;
  return {
    puzzleId: 'daily-812',
    solution: sol,
    wordLength: toChars(sol).length,
    maxGuesses: 6,
    guesses: evals,
    status: won ? 'won' : 'lost',
    hintsUsed: 0,
    startedAt: 1_770_000_000_000,
    finishedAt: 1_770_000_120_000,
  };
}

export function runShareContractSuite(name: string, fx: ShareSuiteFixture): void {
  const SOLUTION = 'باغبان';
  const GUESSES = ['دبستان'.slice(0, 6), 'بادبان', 'باغبان'] as const;

  describe(`ShareApi contract — ${name}`, () => {
    it('گرید بی‌اسپویلر است: مستقل از حروف جواب/حدس‌ها (دو جواب متفاوت، گرید یکسان)', () => {
      const share = fx.makeShare();
      // دو بازی با جواب‌ها و حدس‌های کاملاً متفاوت اما الگوی رنگ یکسان:
      // اگر حتی یک حرف به گرید نشت کند، خروجی‌ها متفاوت می‌شوند.
      const gridA = share.buildResultGrid(buildWonState('باغبان', ['بادبان', 'باغبان']));
      const gridB = share.buildResultGrid(buildWonState('گلستان', ['دستگاه', 'گلستان']));
      // ادعای قوی و مطمئن: ردیف‌های ایموجی هیچ حرف فارسی/لاتینی ندارند.
      for (const grid of [gridA, gridB]) {
        const rows = grid.split('\n').filter((l) => /[🟩🟨⬜⬛]/u.test(l));
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(/[\u0600-\u06FFa-zA-Z]/u.test(row), `حرف در ردیف گرید: «${row}»`).toBe(false);
        }
      }
      // و متن غیر-ایموجی گرید فقط برند/شمارنده است — هیچ حرفی از جواب‌ها که در برند
      // «دُردانه» نیست، نباید در خروجی باشد (غ، ب از باغبان؛ گ، ل، س، ت از گلستان):
      for (const [grid, letters] of [
        [gridA, ['غ', 'ب']],
        [gridB, ['گ', 'ل', 'س', 'ت']],
      ] as const) {
        for (const ch of letters) {
          expect(grid.includes(ch), `اسپویلر: حرف «${ch}» در گرید`).toBe(false);
        }
      }
    });

    it('شماره‌ی معما با ارقام فارسی در گرید هست («۸۱۲») و رقم لاتین 812 نیست', () => {
      const share = fx.makeShare();
      const grid = share.buildResultGrid(buildWonState(SOLUTION, GUESSES));
      expect(grid).toContain(toPersianDigits(812)); // ۸۱۲
      expect(/812/.test(grid)).toBe(false);
    });

    it('گرید به‌ازای هر حدس یک ردیف ایموجی هم‌طول با کلمه دارد', () => {
      const share = fx.makeShare();
      const state = buildWonState(SOLUTION, GUESSES);
      const grid = share.buildResultGrid(state);
      const emojiRows = grid
        .split('\n')
        .filter((line) => /^[🟩🟨⬜⬛]+$/u.test(line.trim()) && line.trim().length > 0);
      expect(emojiRows).toHaveLength(state.guesses.length);
      for (const row of emojiRows) {
        expect([...row.trim()].length).toBe(state.wordLength);
      }
    });

    it('ردیف آخرِ برد تماماً 🟩 است', () => {
      const share = fx.makeShare();
      const grid = share.buildResultGrid(buildWonState(SOLUTION, GUESSES));
      const rows = grid.split('\n').filter((l) => /[🟩🟨⬜⬛]/u.test(l));
      const last = rows[rows.length - 1] ?? '';
      expect([...last.trim()].every((c) => c === '🟩')).toBe(true);
    });

    it('buildInviteLink لینک deep معتبر با kind و id می‌سازد', () => {
      const share = fx.makeShare();
      const url = share.buildInviteLink('duel', 'abc123');
      expect(url).toMatch(/^(https:\/\/|dordaneh:\/\/)/);
      expect(url).toContain('duel');
      expect(url).toContain('abc123');
    });

    it('shareResult و shareCard هرگز reject نمی‌شوند (فالبک کپی — silent degrade)', async () => {
      const share = fx.makeShare();
      await expect(share.shareResult(buildWonState(SOLUTION, GUESSES))).resolves.toBeUndefined();
      await expect(
        share.shareCard({
          id: 'c1',
          kind: 'fact',
          title: 'دانستنی',
          body: 'متن',
          source: 'منبع',
          shareCaption: 'کپشن',
        }),
      ).resolves.toBeUndefined();
    });
  });
}
