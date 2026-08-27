/**
 * دموی توسعه‌ی game-board — فقط برای تست دستی/بصری AI-06.
 * در اپ واقعی، app-shell (AI-05) روتینگ و تزریق‌ها را انجام می‌دهد.
 */

import { h, render } from 'preact';
import { GameScreen } from '../src/components/game-screen';
import { GAME_BOARD_CSS } from '../src/styles';
import type { GameMode } from '../src/logic/controller';

// تزریق استایل‌های پکیج (کاری که app-shell خواهد کرد)
const styleEl = document.createElement('style');
styleEl.textContent = GAME_BOARD_CSS;
document.head.appendChild(styleEl);

const root = document.getElementById('app') as HTMLElement;
const nav = document.getElementById('demo-nav') as HTMLElement;

const MODES: { mode: GameMode; label: string }[] = [
  { mode: 'daily', label: 'روزانه' },
  { mode: 'practice', label: 'تمرین' },
  { mode: 'duel', label: 'دوئل' },
];

let current: GameMode = 'daily';

function mount(): void {
  render(null, root);
  render(
    h(GameScreen, {
      mode: current,
      duelSeed: 12345,
      // آمار زنده‌ی نمونه (گواه اجتماعی) — در اپ واقعی از remote config
      liveStat: current === 'daily' ? { percent: 42, guess: 4 } : null,
    }),
    root,
  );
  for (const btn of Array.from(nav.querySelectorAll('button'))) {
    btn.classList.toggle('active', btn.dataset.mode === current);
  }
}

for (const { mode, label } of MODES) {
  const b = document.createElement('button');
  b.textContent = label;
  b.dataset.mode = mode;
  b.addEventListener('pointerdown', () => {
    current = mode;
    mount();
  });
  nav.appendChild(b);
}

mount();
