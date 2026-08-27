/**
 * @dordaneh/game-board — صفحه‌ی بازی، کیبورد فارسی، انیمیشن و Game Feel.
 * مالک: AI-06. پیاده‌سازی طبق docs/02_CONTRACTS.md (§1، §4، §5، §6، §9).
 *
 * صادرات اصلی: GameScreen (روت‌های `/` و `/practice` — قرارداد §6).
 */

// کامپوننت صادراتی قرارداد
export { GameScreen } from './components/game-screen';
export type { GameScreenProps, LiveStatData } from './components/game-screen';
export type { GuessDistribution } from './components/result-modal';

// استایل‌ها — app-shell یک‌بار تزریق می‌کند
export { GAME_BOARD_CSS } from './styles';

// منطق عمومی (برای تست QA و مصرف app-shell در صورت نیاز)
export { createBoardController } from './logic/controller';
export type {
  BoardController,
  BoardPhase,
  BoardViewState,
  ControllerDeps,
  GameMode,
} from './logic/controller';
export { KEYBOARD_ROWS, PERSIAN_LETTERS, FREQUENT_LETTERS, layoutLetters } from './logic/keyboard-layout';
export type { KeyDef, KeyType } from './logic/keyboard-layout';
export { mapKeyEvent } from './logic/physical-keys';
export type { KeyAction, KeyEventLike } from './logic/physical-keys';
export { computeKeyStates } from './logic/key-states';
export type { KeyState } from './logic/key-states';
export { computeProgress } from './logic/progress';
export type { DiscoveryProgress } from './logic/progress';
export { TIMINGS, flipDelayMs, revealMomentMs, revealTotalMs } from './logic/timings';
export { prefersReducedMotion } from './logic/reduced-motion';

// mockهای قراردادی (فقط dev/demo/test — تا آماده‌شدن پکیج‌های AI-01 و AI-13)
export { createMockEngine } from './mocks/mock-engine';
export { createMockAudio } from './mocks/mock-audio';
export { resolveEngine, resolveAudio } from './mocks/adapters';
