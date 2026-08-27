/**
 * ابزارهای مشترک تست — fixture و mockهای محیطی (بدون jsdom؛ صفر وابستگی).
 */

import type { CultureCard, GuessEvaluation, LetterState, PuzzleState } from '@dordaneh/contracts';
import type {
  MinimalCanvas,
  MinimalCanvas2D,
  MinimalGradient,
} from '../src/types';

export function evalOf(states: LetterState[], guess = 'کلمه‌ای'): GuessEvaluation {
  return { guess, states };
}

export function wonState(overrides: Partial<PuzzleState> = {}): PuzzleState {
  return {
    puzzleId: 'daily-812',
    solution: 'دلاور',
    wordLength: 6,
    maxGuesses: 6,
    guesses: [
      evalOf(['absent', 'present', 'absent', 'absent', 'absent', 'correct']),
      evalOf(['present', 'correct', 'absent', 'absent', 'correct', 'correct']),
      evalOf(['correct', 'correct', 'present', 'absent', 'correct', 'correct']),
      evalOf(['correct', 'correct', 'correct', 'correct', 'correct', 'correct']),
    ],
    status: 'won',
    hintsUsed: 0,
    startedAt: 1_000,
    finishedAt: 2_000,
    ...overrides,
  };
}

export function lostState(): PuzzleState {
  return wonState({
    status: 'lost',
    guesses: Array.from({ length: 6 }, () =>
      evalOf(['absent', 'absent', 'present', 'absent', 'absent', 'absent']),
    ),
  });
}

export const sampleCard: CultureCard = {
  id: 'prov-001',
  kind: 'proverb',
  title: 'ضرب‌المثل روز',
  body: 'هر که بامش بیش، برفش بیشتر',
  explanation: 'هر چه دارایی و مسئولیت بیشتر باشد، دردسر هم بیشتر است.',
  source: 'امثال و حکم دهخدا',
  shareCaption: 'یک ضرب‌المثل قشنگ از دُردانه 💎',
};

export const legendaryCard: CultureCard = {
  ...sampleCard,
  id: 'occ-001',
  kind: 'occasion',
  title: 'شب یلدا',
  body: 'بر آمد باد صبح و بوی نوروز\nبه کام دوستان و بخت پیروز',
  source: 'دیوان حافظ',
};

/** ثبت عملیات رسم برای تست snapshot */
export interface CanvasOp {
  op: string;
  args: unknown[];
}

export interface RecordingCanvas extends MinimalCanvas {
  ops: CanvasOp[];
  /** متن‌های fillText شده — برای بررسی محتوا */
  texts: string[];
}

/** mock canvas ثبت‌کننده — measureText عرض را ~۲۸px به‌ازای هر نویسه برمی‌گرداند */
export function createRecordingCanvas(width: number, height: number): RecordingCanvas {
  const ops: CanvasOp[] = [];
  const texts: string[] = [];
  const rec =
    (op: string) =>
    (...args: unknown[]): void => {
      ops.push({ op, args });
    };
  const gradient: MinimalGradient = { addColorStop: rec('addColorStop') };
  const ctx: MinimalCanvas2D = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    direction: 'rtl',
    globalAlpha: 1,
    fillRect: rec('fillRect'),
    strokeRect: rec('strokeRect'),
    fillText(text: string, x: number, y: number): void {
      ops.push({ op: 'fillText', args: [text, x, y] });
      texts.push(text);
    },
    measureText(text: string) {
      return { width: text.length * 28 };
    },
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arc: rec('arc'),
    arcTo: rec('arcTo'),
    closePath: rec('closePath'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    save: rec('save'),
    restore: rec('restore'),
    createLinearGradient: () => gradient,
  };
  return {
    width,
    height,
    ops,
    texts,
    getContext: () => ctx,
    toBlob(cb: (b: Blob | null) => void): void {
      cb(new Blob([`png:${width}x${height}:${ops.length}ops`], { type: 'image/png' }));
    },
  };
}
