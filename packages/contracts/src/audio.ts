/**
 * @dordaneh/contracts — AudioApi contract (implemented by AI-13 in @dordaneh/audio-haptics).
 * Source of truth: docs/02_CONTRACTS.md §9. Locked (RFC only).
 */

export type SfxName =
  | 'tap'
  | 'flip'
  | 'correct'
  | 'present'
  | 'absent'
  | 'win'
  | 'lose'
  | 'streak'
  | 'card_reveal'
  | 'confetti';

export type HapticKind = 'light' | 'medium' | 'success' | 'error';

export interface AudioApi {
  play(name: SfxName): void;
  setMusicEnabled(on: boolean): void;
  setSfxEnabled(on: boolean): void;
  haptic(kind: HapticKind): void;
}
