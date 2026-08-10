/**
 * @dordaneh/contracts — ShareApi contract (implemented by AI-07 in @dordaneh/viral-share).
 * Source of truth: docs/02_CONTRACTS.md §12. Locked (RFC only).
 */

import type { PuzzleState } from './core';
import type { CultureCard } from './culture-cards';

export interface ShareApi {
  /** گرید ایموجی بی‌اسپویلر 🟩🟨⬜ + «دُردانه #۸۱۲» */
  buildResultGrid(state: PuzzleState): string;
  /** Web Share API → فالبک کپی */
  shareResult(state: PuzzleState): Promise<void>;
  /** رندر تصویر کارت (canvas) + share */
  shareCard(card: CultureCard): Promise<void>;
  /** deep link — https://dordaneh.ir/d/* یا dordaneh:// */
  buildInviteLink(kind: 'circle' | 'duel', id: string): string;
}
