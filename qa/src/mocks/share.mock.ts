/**
 * @dordaneh/qa — mock مرجع ShareApi (تا آماده‌شدن @dordaneh/viral-share از AI-07).
 * طبق docs/02_CONTRACTS.md §12: گرید بی‌اسپویلر 🟩🟨⬜ + «دُردانه #۸۱۲» با ارقام فارسی.
 */

import {
  toPersianDigits,
  type CultureCard,
  type LetterState,
  type PuzzleState,
  type ShareApi,
} from '@dordaneh/contracts';

const EMOJI: Readonly<Record<LetterState, string>> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
  empty: '⬜',
  tbd: '⬜',
};

export interface ShareSink {
  /** آخرین متن «share/copy شده» — برای assert در تست */
  lastShared: string | null;
}

export function createMockShare(): ShareApi & { sink: ShareSink } {
  const sink: ShareSink = { lastShared: null };

  function puzzleLabel(state: PuzzleState): string {
    // 'daily-812' → «دُردانه #۸۱۲» ؛ practice → بدون شماره‌ی رسمی
    const m = /^daily-(\d+)$/.exec(state.puzzleId);
    const num = m ? toPersianDigits(m[1] as string) : '';
    return num ? `دُردانه #${num}` : 'دُردانه — تمرین';
  }

  const api: ShareApi & { sink: ShareSink } = {
    sink,
    buildResultGrid(state: PuzzleState): string {
      const header =
        state.status === 'won'
          ? `${puzzleLabel(state)} ${toPersianDigits(state.guesses.length)}/${toPersianDigits(state.maxGuesses)}`
          : `${puzzleLabel(state)} ✗/${toPersianDigits(state.maxGuesses)}`;
      const rows = state.guesses.map((g) => g.states.map((s) => EMOJI[s]).join(''));
      return [header, '', ...rows].join('\n');
    },
    async shareResult(state: PuzzleState): Promise<void> {
      sink.lastShared = api.buildResultGrid(state);
    },
    async shareCard(card: CultureCard): Promise<void> {
      sink.lastShared = card.shareCaption;
    },
    buildInviteLink(kind: 'circle' | 'duel', id: string): string {
      return `https://dordaneh.ir/d/${kind}/${encodeURIComponent(id)}`;
    },
  };
  return api;
}
