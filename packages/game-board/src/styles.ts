/**
 * استایل‌های game-board — به‌صورت رشته‌ی CSS صادر می‌شود تا app-shell تزریق کند
 * (بدون وابستگی به باندلر CSS). فقط از CSS Variables قرارداد ui-kit (§4).
 * همه‌ی انیمیشن‌ها transform/opacity (خط قرمز #27) + احترام کامل به
 * prefers-reduced-motion.
 *
 * سبک بصری: آمیرزا (RFC-0015) — کاشی چوبی 3D + کیبورد گنبدی چوبی.
 */

import { TIMINGS } from './logic/timings';

export const GAME_BOARD_CSS = `
/* ============ صفحه ============ */
.gb-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dor-space-4);
  padding: var(--dor-space-3);
  font-family: var(--dor-font);
  direction: rtl;
  max-inline-size: 520px;
  margin-inline: auto;
  min-block-size: 100%;
  touch-action: manipulation;
}

/* حالت تمرکز */
.gb-screen[data-focus='true'] .gb-peripheral {
  opacity: 0.35;
  transition: opacity 600ms ease;
}
.gb-peripheral { transition: opacity 600ms ease; }

/* ============ برد ============ */
.gb-board {
  display: grid;
  gap: 8px;
  inline-size: 100%;
  max-inline-size: min(94vw, 400px);
  padding: var(--dor-space-3);
  background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 100%);
  border-radius: var(--dor-radius-3);
  box-shadow:
    inset 0 3px 8px rgba(0,0,0,0.15),
    0 4px 12px rgba(0,0,0,0.1);
}
.gb-row {
  display: grid;
  grid-template-columns: repeat(var(--gb-len, 6), 1fr);
  gap: 8px;
  direction: rtl;
}

/* لرزش حدس نامعتبر */
.gb-row[data-shake='true'] {
  animation: gb-shake ${TIMINGS.shakeMs}ms ease-in-out;
}
@keyframes gb-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

/* ============ کاشی چوبی سه‌بعدی ============ */
.gb-tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--dor-font-display);
  font-size: clamp(1.4rem, 7vw, 2.2rem);
  font-weight: 900;
  border-radius: 10px;
  border: 2px solid var(--dor-tile-empty-border);
  background: var(--dor-tile-empty-face);
  color: var(--dor-on-tile-empty);
  user-select: none;
  transform-style: preserve-3d;
  will-change: transform;
  box-shadow:
    inset 0 -3px 0 rgba(0,0,0,0.08),
    inset 0 2px 0 rgba(255,255,255,0.4),
    0 1px 2px rgba(0,0,0,0.1);
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  position: relative;
  overflow: hidden;
}

/* پاپ تایپ */
.gb-tile[data-pop='true'] {
  animation: gb-pop ${TIMINGS.tapPopMs}ms ease-out;
}
@keyframes gb-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

/* فلیپ پلکانی */
.gb-tile[data-flip='true'] {
  animation: gb-flip ${TIMINGS.flipDurationMs}ms ease-in-out both;
  animation-delay: calc(var(--gb-i, 0) * ${TIMINGS.flipStaggerMs}ms);
}
@keyframes gb-flip {
  0% { transform: rotateX(0deg); }
  50% { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}

/* رنگ وضعیت‌ها — گرادیان سبک آمیرزا */
.gb-tile[data-state='correct'] {
  background: var(--dor-tile-correct-face);
  border-color: transparent;
  color: var(--dor-on-correct);
  box-shadow:
    inset 0 -4px 0 var(--dor-tile-correct-edge),
    inset 0 2px 0 rgba(255,255,255,0.35),
    0 4px 8px rgba(0,0,0,0.2);
  text-shadow:
    0 2px 0 rgba(0,0,0,0.4),
    0 3px 6px rgba(0,0,0,0.25);
}
.gb-tile[data-state='present'] {
  background: var(--dor-tile-present-face);
  border-color: transparent;
  color: var(--dor-on-present);
  box-shadow:
    inset 0 -4px 0 var(--dor-tile-present-edge),
    inset 0 2px 0 rgba(255,255,255,0.4),
    0 4px 8px rgba(0,0,0,0.2);
  text-shadow: 0 1px 0 rgba(255,255,255,0.35);
}
.gb-tile[data-state='absent']  {
  background: var(--dor-tile-absent-face);
  border-color: transparent;
  color: var(--dor-on-absent);
  box-shadow:
    inset 0 -4px 0 var(--dor-tile-absent-edge),
    inset 0 2px 0 rgba(255,255,255,0.25),
    0 4px 8px rgba(0,0,0,0.25);
  text-shadow:
    0 2px 0 rgba(0,0,0,0.5),
    0 3px 6px rgba(0,0,0,0.3);
}
.gb-tile[data-state='tbd'] {
  border-color: var(--dor-accent);
  background: linear-gradient(180deg, #fff8ec 0%, #fbdc9a 100%);
  color: var(--dor-ink);
  box-shadow:
    inset 0 -3px 0 rgba(0,0,0,0.1),
    inset 0 2px 0 rgba(255,255,255,0.5),
    0 2px 6px rgba(0,0,0,0.15),
    0 0 0 3px rgba(212,160,32,0.25);
}
/* درخشش شیشه‌ای روی کاشی — درست به سبک آمیرزا */
.gb-tile::before {
  content: '';
  position: absolute;
  inset: 3px 4px auto 4px;
  height: 42%;
  border-radius: 7px;
  background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0));
  pointer-events: none;
}

/* موج برد */
.gb-tile[data-dance='true'] {
  animation: gb-dance ${TIMINGS.winWaveMs}ms ease-in-out both;
  animation-delay: calc(var(--gb-i, 0) * ${TIMINGS.winWaveStaggerMs}ms);
}
@keyframes gb-dance {
  0%, 100% { transform: translateY(0) rotate(0); }
  35% { transform: translateY(-16px) rotate(-3deg); }
  65% { transform: translateY(3px) rotate(2deg); }
}

/* ============ نوار پیشرفت ============ */
.gb-progress {
  inline-size: 100%;
  max-inline-size: min(92vw, 380px);
  block-size: 10px;
  border-radius: var(--dor-radius-round);
  background: rgba(60, 30, 10, 0.2);
  overflow: hidden;
  box-shadow: inset 0 2px 3px rgba(0,0,0,0.25);
}
.gb-progress-fill {
  block-size: 100%;
  border-radius: var(--dor-radius-round);
  background: linear-gradient(180deg, #7cc846 0%, #4d8f2c 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.5),
    inset 0 -1px 0 rgba(0,0,0,0.2),
    0 0 6px rgba(77,143,44,0.4);
  transform-origin: 100% 50%;
  transform: scaleX(var(--gb-ratio, 0));
  transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
.gb-progress-label {
  font-size: 0.8rem;
  color: var(--dor-ink-soft);
  font-weight: 700;
  margin-block-start: var(--dor-space-1);
  text-align: center;
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}

/* ============ آمار زنده ============ */
.gb-livestat {
  font-size: 0.85rem;
  color: var(--dor-ink);
  font-weight: 700;
  background: rgba(251, 220, 154, 0.6);
  padding: var(--dor-space-1) var(--dor-space-3);
  border-radius: var(--dor-radius-round);
  border: 1px solid var(--dor-gold);
  text-align: center;
  text-shadow: 0 1px 0 rgba(255,255,255,0.4);
}

/* ============ کیبورد چوبی گنبدی ============ */
.gb-keyboard {
  inline-size: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--dor-space-3);
  padding-block-end: calc(var(--dor-space-3) + env(safe-area-inset-bottom, 0));
  background: url("/assets/img/wood-tray.jpg") center/cover, var(--dor-wood-plank);
  border-radius: var(--dor-radius-3) var(--dor-radius-3) 0 0;
  box-shadow:
    inset 0 3px 0 rgba(255,255,255,0.2),
    inset 0 -3px 0 rgba(0,0,0,0.35),
    0 -6px 16px rgba(0,0,0,0.2);
  position: relative;
}
.gb-keyboard::before {
  content: '';
  position: absolute;
  inset-inline: var(--dor-space-3);
  inset-block-start: 4px;
  block-size: 3px;
  background: repeating-linear-gradient(
    90deg,
    rgba(0,0,0,0.25) 0 2px,
    transparent 2px 14px
  );
  opacity: 0.5;
  pointer-events: none;
}
.gb-krow {
  display: flex;
  gap: 5px;
  direction: rtl;
  justify-content: center;
}
.gb-key {
  flex: 1 1 0;
  min-inline-size: 0;
  block-size: clamp(46px, 8vh, 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, #fbf3dc 0%, #efdcb2 60%, #d4b070 100%);
  color: var(--dor-ink);
  font-family: var(--dor-font-display);
  font-size: clamp(1rem, 4.5vw, 1.3rem);
  font-weight: 900;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 80ms ease,
    box-shadow 80ms ease;
  will-change: transform;
  box-shadow:
    0 3px 0 rgba(122, 87, 44, 0.9),
    0 4px 6px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.55);
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  position: relative;
}
.gb-key::before {
  content: '';
  position: absolute;
  inset: 3px 4px auto 4px;
  height: 40%;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0));
  pointer-events: none;
}
.gb-key:active {
  transform: translateY(3px);
  box-shadow:
    0 0 0 rgba(122, 87, 44, 0.9),
    0 1px 2px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.45);
}
.gb-key[data-wide='true'] { flex-grow: 1.45; }
.gb-key[data-action='true'] {
  flex-grow: 1.7;
  background: var(--dor-btn-green);
  color: #fff8ec;
  font-size: clamp(0.85rem, 3.5vw, 1.05rem);
  box-shadow:
    0 3px 0 var(--dor-btn-green-edge),
    0 4px 6px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.35);
  text-shadow: 0 1px 0 rgba(0,0,0,0.35);
}
.gb-key[data-action='true']:active {
  box-shadow:
    0 0 0 var(--dor-btn-green-edge),
    0 1px 2px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.3);
}
/* حالت backspace = قرمز */
.gb-key[data-action='backspace'],
.gb-key[data-key='backspace'] {
  background: var(--dor-btn-red);
  box-shadow:
    0 3px 0 var(--dor-btn-red-edge),
    0 4px 6px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.35);
}

/* حالت‌های رنگی کیبورد بعد از حدس — سبک آمیرزا */
.gb-key[data-state='correct'] {
  background: var(--dor-tile-correct-face);
  color: var(--dor-on-correct);
  box-shadow:
    0 3px 0 var(--dor-tile-correct-edge),
    0 4px 6px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.35);
  text-shadow: 0 1px 0 rgba(0,0,0,0.4);
}
.gb-key[data-state='present'] {
  background: var(--dor-tile-present-face);
  color: var(--dor-on-present);
  box-shadow:
    0 3px 0 var(--dor-tile-present-edge),
    0 4px 6px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.4);
}
.gb-key[data-state='absent']  {
  background: var(--dor-tile-absent-face);
  color: var(--dor-on-absent);
  opacity: 0.85;
  box-shadow:
    0 3px 0 var(--dor-tile-absent-edge),
    0 4px 6px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.25);
  text-shadow: 0 1px 0 rgba(0,0,0,0.4);
}

/* ============ راهنما و نوار بالا ============ */
.gb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
  max-inline-size: min(92vw, 400px);
  padding: var(--dor-space-2) var(--dor-space-3);
  background: rgba(251, 243, 220, 0.85);
  border-radius: var(--dor-radius-round);
  border: 2px solid var(--dor-border);
  box-shadow: var(--dor-shadow-1);
  backdrop-filter: blur(4px);
}
.gb-hint-btn {
  border: none;
  background: var(--dor-btn-gold);
  color: var(--dor-on-gold);
  border-radius: var(--dor-radius-round);
  padding: var(--dor-space-2) var(--dor-space-4);
  font-family: var(--dor-font);
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow:
    0 3px 0 var(--dor-btn-gold-edge),
    0 4px 6px rgba(0,0,0,0.2),
    inset 0 2px 0 rgba(255,255,255,0.5);
  text-shadow: 0 1px 0 rgba(255,255,255,0.4);
  transition: transform 80ms ease;
}
.gb-hint-btn:active {
  transform: translateY(2px);
  box-shadow:
    0 1px 0 var(--dor-btn-gold-edge),
    0 2px 4px rgba(0,0,0,0.2),
    inset 0 2px 0 rgba(255,255,255,0.4);
}
.gb-hint-text {
  font-size: 0.95rem;
  color: var(--dor-ink);
  font-weight: 800;
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}

/* ============ Toast ============ */
.gb-toast {
  position: fixed;
  inset-block-start: 12%;
  inset-inline: 0;
  margin-inline: auto;
  inline-size: fit-content;
  max-inline-size: 88vw;
  background: linear-gradient(180deg, #3a2416 0%, #1a1008 100%);
  color: #fff8ec;
  padding: var(--dor-space-3) var(--dor-space-5);
  border-radius: var(--dor-radius-round);
  font-family: var(--dor-font);
  font-size: 1rem;
  font-weight: 700;
  z-index: 60;
  animation: gb-toast-in 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  box-shadow:
    0 6px 20px rgba(0,0,0,0.35),
    inset 0 2px 0 rgba(255,255,255,0.15);
  border: 2px solid var(--dor-gold);
  text-shadow: 0 1px 0 rgba(0,0,0,0.5);
}
@keyframes gb-toast-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ============ مودال نتیجه ============ */
.gb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(26, 16, 8, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  animation: gb-fade-in 260ms ease-out;
  padding: var(--dor-space-4);
}
@keyframes gb-fade-in { from { opacity: 0; } to { opacity: 1; } }
.gb-modal {
  background: var(--dor-card-paper);
  color: var(--dor-ink);
  border-radius: var(--dor-radius-3);
  padding: var(--dor-space-5) var(--dor-space-4);
  inline-size: min(92vw, 400px);
  font-family: var(--dor-font);
  direction: rtl;
  text-align: center;
  animation: gb-modal-in 320ms cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow:
    var(--dor-shadow-3),
    inset 0 0 0 3px var(--dor-card-border),
    inset 0 0 0 5px var(--dor-surface),
    inset 0 0 0 6px var(--dor-card-border),
    0 0 40px rgba(212,160,32,0.3);
  position: relative;
  overflow: hidden;
}
.gb-modal::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 10% 10%, var(--dor-gold) 2.5px, transparent 3.5px),
    radial-gradient(circle at 90% 10%, var(--dor-gold) 2.5px, transparent 3.5px),
    radial-gradient(circle at 10% 90%, var(--dor-gold) 2.5px, transparent 3.5px),
    radial-gradient(circle at 90% 90%, var(--dor-gold) 2.5px, transparent 3.5px);
  opacity: 0.6;
  pointer-events: none;
}
@keyframes gb-modal-in {
  from { opacity: 0; transform: scale(0.85) translateY(20px) rotate(-2deg); }
  to { opacity: 1; transform: scale(1) translateY(0) rotate(0); }
}
.gb-modal h2 {
  margin: 0 0 var(--dor-space-3);
  font-family: var(--dor-font-display);
  font-size: 1.6rem;
  font-weight: 900;
  position: relative;
  color: var(--dor-ink);
  text-shadow: 0 1px 0 rgba(255,255,255,0.6);
}
.gb-dist { display: flex; flex-direction: column; gap: 6px; margin-block: var(--dor-space-4); position: relative; }
.gb-dist-row { display: flex; align-items: center; gap: var(--dor-space-2); font-size: 0.85rem; font-weight: 700; color: var(--dor-ink); }
.gb-dist-bar {
  block-size: 22px;
  border-radius: var(--dor-radius-round);
  background: var(--dor-tile-absent-face);
  color: #fff8ec;
  font-size: 0.75rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-inline: 10px;
  min-inline-size: 24px;
  transform-origin: 100% 50%;
  box-shadow:
    inset 0 -2px 0 rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.25);
  text-shadow: 0 1px 0 rgba(0,0,0,0.35);
}
.gb-dist-bar[data-hit='true'] {
  background: var(--dor-tile-correct-face);
  box-shadow:
    inset 0 -2px 0 var(--dor-tile-correct-edge),
    inset 0 1px 0 rgba(255,255,255,0.3);
}
.gb-modal-actions {
  display: flex;
  gap: var(--dor-space-3);
  justify-content: center;
  margin-block-start: var(--dor-space-4);
  position: relative;
}
.gb-share-btn {
  background: var(--dor-btn-green);
  color: #fff8ec;
  border: none;
  border-radius: var(--dor-radius-round);
  padding: var(--dor-space-3) var(--dor-space-5);
  font-family: var(--dor-font);
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow:
    0 4px 0 var(--dor-btn-green-edge),
    0 6px 10px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.35);
  text-shadow: 0 1px 0 rgba(0,0,0,0.35);
  transition: transform 80ms ease;
}
.gb-share-btn:active {
  transform: translateY(3px);
  box-shadow:
    0 1px 0 var(--dor-btn-green-edge),
    0 2px 4px rgba(0,0,0,0.25),
    inset 0 2px 0 rgba(255,255,255,0.3);
}
.gb-close-btn {
  background: transparent;
  color: var(--dor-ink);
  border: 2px solid var(--dor-border);
  border-radius: var(--dor-radius-round);
  padding: var(--dor-space-3) var(--dor-space-5);
  font-family: var(--dor-font);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms ease;
}
.gb-close-btn:hover {
  background: var(--dor-surface-2);
}
.gb-solution {
  font-family: var(--dor-font-display);
  font-weight: 900;
  color: var(--dor-danger);
  font-size: 1.4rem;
  letter-spacing: 3px;
  display: inline-block;
  padding: var(--dor-space-1) var(--dor-space-4);
  background: rgba(212,160,32,0.15);
  border-radius: var(--dor-radius-round);
  border: 2px dashed var(--dor-gold);
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}

/* ============ کانفتی ============ */
.gb-confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 55;
  overflow: hidden;
}
.gb-confetti span {
  position: absolute;
  inset-block-start: -4vh;
  inline-size: 10px;
  block-size: 16px;
  border-radius: 3px;
  opacity: 0;
  animation: gb-confetti-fall 3s cubic-bezier(0.35, 0, 0.65, 1) both;
  animation-delay: var(--gb-d, 0ms);
  background: var(--gb-c, var(--dor-gold));
  inset-inline-start: var(--gb-x, 50%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
@keyframes gb-confetti-fall {
  0% { opacity: 1; transform: translateY(0) rotate(0deg); }
  100% { opacity: 0.85; transform: translateY(110vh) rotate(720deg); }
}

/* ============ انتخاب دشواری (practice) ============ */
.gb-difficulty {
  display: flex;
  gap: var(--dor-space-2);
  flex-wrap: wrap;
  justify-content: center;
}
.gb-diff-btn {
  border: none;
  background: linear-gradient(180deg, #fbf3dc 0%, #efdcb2 100%);
  color: var(--dor-ink);
  border-radius: var(--dor-radius-round);
  padding: var(--dor-space-2) var(--dor-space-4);
  font-family: var(--dor-font);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow:
    0 3px 0 var(--dor-border),
    0 4px 6px rgba(0,0,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.5);
  transition: transform 80ms ease;
}
.gb-diff-btn:active {
  transform: translateY(2px);
  box-shadow:
    0 1px 0 var(--dor-border),
    0 2px 4px rgba(0,0,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.4);
}
.gb-diff-btn[data-active='true'] {
  background: var(--dor-btn-orange);
  color: #fff8ec;
  box-shadow:
    0 3px 0 var(--dor-btn-orange-edge),
    0 4px 6px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.4);
  text-shadow: 0 1px 0 rgba(0,0,0,0.3);
}

/* ============ کاهش حرکت ============ */
@media (prefers-reduced-motion: reduce) {
  .gb-tile[data-pop='true'],
  .gb-tile[data-flip='true'],
  .gb-tile[data-dance='true'],
  .gb-row[data-shake='true'],
  .gb-confetti span,
  .gb-modal,
  .gb-modal-backdrop,
  .gb-toast {
    animation: none !important;
  }
  .gb-progress-fill, .gb-key { transition: none !important; }
}

/* ============ ریسپانسیو 320px ============ */
@media (max-width: 360px) {
  .gb-screen { gap: var(--dor-space-2); padding: var(--dor-space-2); }
  .gb-key { block-size: 44px; font-size: 0.95rem; }
  .gb-tile { font-size: 1.3rem; }
  .gb-keyboard { padding: var(--dor-space-2); }
}
`;
