/**
 * کیبورد فارسی درون-بازی — pointerdown (نه click ~300ms تأخیر؛ Doherty 1982)
 * + sync رنگ با وضعیت حروف کشف‌شده + کلیدهای پهن فیتس.
 */

import { useMemo } from 'preact/hooks';
import type { GuessEvaluation } from '@dordaneh/contracts';
import { KEYBOARD_ROWS, type KeyDef } from '../logic/keyboard-layout';
import { computeKeyStates } from '../logic/key-states';
import { t, tFa } from '../i18n';

export interface KeyboardProps {
  guesses: readonly GuessEvaluation[];
  disabled: boolean;
  onLetter(letter: string): void;
  onSubmit(): void;
  onBackspace(): void;
}

const BACKSPACE_GLYPH = '⌫';

export function Keyboard({ guesses, disabled, onLetter, onSubmit, onBackspace }: KeyboardProps) {
  const keyStates = useMemo(() => computeKeyStates(guesses), [guesses]);

  function press(k: KeyDef): void {
    if (disabled) return;
    if (k.type === 'letter' && k.letter) onLetter(k.letter);
    else if (k.type === 'submit') onSubmit();
    else if (k.type === 'backspace') onBackspace();
  }

  return (
    <nav id="game-keyboard" class="gb-keyboard" aria-label={tFa('gameBoard.keyboardLabel')}>
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} class="gb-krow">
          {row.map((k) => {
            const st = k.type === 'letter' && k.letter ? keyStates.get(k.letter) : undefined;
            const label =
              k.type === 'submit'
                ? t('gameBoard.submit')
                : k.type === 'backspace'
                  ? BACKSPACE_GLYPH
                  : (k.letter ?? '');
            return (
              <button
                key={k.id}
                type="button"
                class="gb-key"
                data-wide={k.wide ? 'true' : undefined}
                data-action={k.type !== 'letter' ? 'true' : undefined}
                data-state={st}
                aria-label={
                  k.type === 'backspace' ? tFa('gameBoard.backspace') : undefined
                }
                onPointerDown={(e: { preventDefault(): void }) => {
                  e.preventDefault(); // جلوگیری از focus/ghost-click — پاسخ فوری
                  press(k);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
