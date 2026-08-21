/**
 * استایل‌های game-board — به‌صورت رشته‌ی CSS صادر می‌شود تا app-shell تزریق کند
 * (بدون وابستگی به باندلر CSS). فقط از CSS Variables قرارداد ui-kit (§4).
 * همه‌ی انیمیشن‌ها transform/opacity (خط قرمز #27) + احترام کامل به
 * prefers-reduced-motion.
 */

import { TIMINGS } from './logic/timings';

export const GAME_BOARD_CSS = `
/* ============ صفحه ============ */
.gb-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dor-space-3);
  padding: var(--dor-space-2);
  font-family: var(--dor-font);
  direction: rtl;
  max-inline-size: 520px;
  margin-inline: auto;
  min-block-size: 100%;
  touch-action: manipulation; /* حذف تأخیر double-tap-zoom موبایل */
}

/* حالت تمرکز: بعد از ۳ حدس، اطراف برد کم‌رنگ (Sweller 1988 — کاهش بار شناختی) */
.gb-screen[data-focus='true'] .gb-peripheral {
  opacity: 0.35;
  transition: opacity 600ms ease;
}
.gb-peripheral { transition: opacity 600ms ease; }

/* ============ برد ============ */
.gb-board {
  display: grid;
  gap: var(--dor-space-1);
  inline-size: 100%;
  max-inline-size: min(92vw, 380px);
}
.gb-row {
  display: grid;
  grid-template-columns: repeat(var(--gb-len, 6), 1fr);
  gap: var(--dor-space-1);
  direction: rtl; /* حرف اول = راست‌ترین خانه */
}

/* لرزش حدس نامعتبر — فقط transform */
.gb-row[data-shake='true'] {
  animation: gb-shake ${TIMINGS.shakeMs}ms ease-in-out;
}
@keyframes gb-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-6px); }
  40%, 60% { transform: translateX(6px); }
}

/* ============ کاشی ============ */
.gb-tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(1.25rem, 6.5vw, 2rem);
  font-weight: 700;
  border-radius: var(--dor-radius);
  border: 2px solid var(--dor-absent);
  background: transparent;
  color: inherit;
  user-select: none;
  transform-style: preserve-3d;
  will-change: transform;
}

/* پاپ تایپ (Doherty: فوری و ظریف) */
.gb-tile[data-pop='true'] {
  animation: gb-pop ${TIMINGS.tapPopMs}ms ease-out;
}
@keyframes gb-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

/* فلیپ پلکانی ثبت حدس */
.gb-tile[data-flip='true'] {
  animation: gb-flip ${TIMINGS.flipDurationMs}ms ease-in-out both;
  animation-delay: calc(var(--gb-i, 0) * ${TIMINGS.flipStaggerMs}ms);
}
@keyframes gb-flip {
  0% { transform: rotateX(0deg); }
  50% { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}

/* رنگ وضعیت‌ها — از توکن‌های قرارداد */
.gb-tile[data-state='correct'] { background: var(--dor-correct); border-color: var(--dor-correct); color: #fff; }
.gb-tile[data-state='present'] { background: var(--dor-present); border-color: var(--dor-present); color: #fff; }
.gb-tile[data-state='absent']  { background: var(--dor-absent);  border-color: var(--dor-absent);  color: #fff; }
.gb-tile[data-state='tbd']     { border-color: var(--dor-accent); }

/* موج برد */
.gb-tile[data-dance='true'] {
  animation: gb-dance ${TIMINGS.winWaveMs}ms ease-in-out both;
  animation-delay: calc(var(--gb-i, 0) * ${TIMINGS.winWaveStaggerMs}ms);
}
@keyframes gb-dance {
  0%, 100% { transform: translateY(0); }
  35% { transform: translateY(-14px); }
  65% { transform: translateY(3px); }
}

/* ============ نوار پیشرفت (شیب هدف) ============ */
.gb-progress {
  inline-size: 100%;
  max-inline-size: min(92vw, 380px);
  block-size: 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--dor-absent) 30%, transparent);
  overflow: hidden;
}
.gb-progress-fill {
  block-size: 100%;
  border-radius: 3px;
  background: var(--dor-accent);
  transform-origin: 100% 50%; /* RTL: از راست پر می‌شود */
  transform: scaleX(var(--gb-ratio, 0));
  transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
.gb-progress-label {
  font-size: 0.75rem;
  opacity: 0.75;
  margin-block-start: var(--dor-space-1);
  text-align: center;
}

/* ============ آمار زنده (گواه اجتماعی) ============ */
.gb-livestat {
  font-size: 0.8rem;
  color: var(--dor-accent);
  text-align: center;
}

/* ============ کیبورد ============ */
.gb-keyboard {
  inline-size: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-block-end: env(safe-area-inset-bottom, 0);
}
.gb-krow {
  display: flex;
  gap: 4px;
  direction: rtl; /* اولین کلید = راست */
  justify-content: center;
}
.gb-key {
  flex: 1 1 0;
  min-inline-size: 0;
  block-size: clamp(44px, 7.5vh, 58px); /* حداقل ۴۴px لمس (WCAG) */
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: calc(var(--dor-radius) / 2);
  background: color-mix(in srgb, var(--dor-absent) 28%, transparent);
  color: inherit;
  font-family: var(--dor-font);
  font-size: clamp(0.9rem, 4vw, 1.15rem);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 60ms ease; /* بازخورد < 100ms */
  will-change: transform;
}
.gb-key:active { transform: scale(0.92); }
.gb-key[data-wide='true'] { flex-grow: 1.45; } /* قانون فیتس: هدف بزرگ‌تر */
.gb-key[data-action='true'] {
  flex-grow: 1.7;
  background: var(--dor-accent);
  color: #fff;
  font-size: clamp(0.8rem, 3.5vw, 1rem);
}
.gb-key[data-state='correct'] { background: var(--dor-correct); color: #fff; }
.gb-key[data-state='present'] { background: var(--dor-present); color: #fff; }
.gb-key[data-state='absent']  { background: color-mix(in srgb, var(--dor-absent) 75%, transparent); color: #fff; opacity: 0.8; }

/* ============ راهنما و نوار بالا ============ */
.gb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
  max-inline-size: min(92vw, 380px);
}
.gb-hint-btn {
  border: 1px solid var(--dor-accent);
  background: transparent;
  color: var(--dor-accent);
  border-radius: var(--dor-radius);
  padding: var(--dor-space-1) var(--dor-space-3);
  font-family: var(--dor-font);
  font-size: 0.85rem;
  cursor: pointer;
}
.gb-hint-text {
  font-size: 0.85rem;
  color: var(--dor-gold);
  font-weight: 700;
}

/* ============ Toast ============ */
.gb-toast {
  position: fixed;
  inset-block-start: 12%;
  inset-inline: 0;
  margin-inline: auto;
  inline-size: fit-content;
  max-inline-size: 88vw;
  background: var(--dor-dark-bg);
  color: #fff;
  padding: var(--dor-space-2) var(--dor-space-4);
  border-radius: var(--dor-radius);
  font-family: var(--dor-font);
  font-size: 0.95rem;
  z-index: 60;
  animation: gb-toast-in 200ms ease-out;
  pointer-events: none;
}
@keyframes gb-toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============ مودال نتیجه ============ */
.gb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  animation: gb-fade-in 220ms ease-out;
}
@keyframes gb-fade-in { from { opacity: 0; } to { opacity: 1; } }
.gb-modal {
  background: var(--dor-bg);
  border-radius: calc(var(--dor-radius) * 1.5);
  padding: var(--dor-space-4);
  inline-size: min(92vw, 360px);
  font-family: var(--dor-font);
  direction: rtl;
  text-align: center;
  animation: gb-modal-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
[data-theme='dark'] .gb-modal { background: var(--dor-dark-bg); color: #fff; }
@keyframes gb-modal-in {
  from { opacity: 0; transform: scale(0.92) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.gb-modal h2 { margin: 0 0 var(--dor-space-2); font-size: 1.3rem; }
.gb-dist { display: flex; flex-direction: column; gap: 4px; margin-block: var(--dor-space-3); }
.gb-dist-row { display: flex; align-items: center; gap: var(--dor-space-1); font-size: 0.8rem; }
.gb-dist-bar {
  block-size: 18px;
  border-radius: 4px;
  background: var(--dor-absent);
  color: #fff;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-inline: 6px;
  min-inline-size: 20px;
  transform-origin: 100% 50%;
}
.gb-dist-bar[data-hit='true'] { background: var(--dor-correct); }
.gb-modal-actions { display: flex; gap: var(--dor-space-2); justify-content: center; }
.gb-share-btn {
  background: var(--dor-accent);
  color: #fff;
  border: none;
  border-radius: var(--dor-radius);
  padding: var(--dor-space-2) var(--dor-space-4);
  font-family: var(--dor-font);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.gb-close-btn {
  background: transparent;
  color: inherit;
  border: 1px solid var(--dor-absent);
  border-radius: var(--dor-radius);
  padding: var(--dor-space-2) var(--dor-space-4);
  font-family: var(--dor-font);
  font-size: 1rem;
  cursor: pointer;
}
.gb-solution { font-weight: 800; color: var(--dor-gold); font-size: 1.15rem; letter-spacing: 2px; }

/* ============ کانفتی سبک ============ */
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
  inline-size: 8px;
  block-size: 14px;
  border-radius: 2px;
  opacity: 0;
  animation: gb-confetti-fall 2.6s ease-in both;
  animation-delay: var(--gb-d, 0ms);
  background: var(--gb-c, var(--dor-accent));
  inset-inline-start: var(--gb-x, 50%);
}
@keyframes gb-confetti-fall {
  0% { opacity: 1; transform: translateY(0) rotate(0deg); }
  100% { opacity: 0.9; transform: translateY(110vh) rotate(660deg); }
}

/* ============ انتخاب دشواری (practice) ============ */
.gb-difficulty {
  display: flex;
  gap: var(--dor-space-1);
  flex-wrap: wrap;
  justify-content: center;
}
.gb-diff-btn {
  border: 1px solid var(--dor-accent);
  background: transparent;
  color: var(--dor-accent);
  border-radius: var(--dor-radius);
  padding: var(--dor-space-1) var(--dor-space-2);
  font-family: var(--dor-font);
  font-size: 0.8rem;
  cursor: pointer;
}
.gb-diff-btn[data-active='true'] { background: var(--dor-accent); color: #fff; }

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
  .gb-screen { gap: var(--dor-space-2); padding: var(--dor-space-1); }
  .gb-key { block-size: 44px; font-size: 0.85rem; }
  .gb-tile { font-size: 1.2rem; border-width: 1.5px; }
}
`;
