/**
 * برد ۶×۶ (maxGuesses × wordLength) — RTL کامل: حرف اول = راست‌ترین خانه
 * (با direction: rtl روی .gb-row، ترتیب DOM = ترتیب منطقی حروف).
 */

import type { LetterState } from '@dordaneh/contracts';
import type { BoardViewState } from '../logic/controller';
import { tFa } from '../i18n';
import { Tile } from './tile';

export interface BoardProps {
  s: BoardViewState;
}

interface TileModel {
  letter: string;
  state: LetterState;
  pop: boolean;
  flip: boolean;
  dance: boolean;
}

function rowTiles(s: BoardViewState, row: number): TileModel[] {
  const out: TileModel[] = [];
  const finalized = s.guesses[row];
  const isCurrent = row === s.guesses.length && s.phase === 'typing';
  const isRevealing = s.revealingRow === row;
  const won = s.phase === 'won' && row === s.guesses.length - 1;
  const current = [...s.current];

  for (let i = 0; i < s.wordLength; i++) {
    if (finalized) {
      const ch = [...finalized.guess][i] ?? '';
      const st = finalized.states[i] ?? 'tbd';
      // در حین reveal پلکانی، کاشی‌های هنوز-برنگشته tbd می‌مانند
      const revealed = !isRevealing || i < s.revealedTiles;
      out.push({
        letter: ch,
        state: revealed ? st : 'tbd',
        pop: false,
        flip: isRevealing,
        dance: won && !isRevealing,
      });
    } else if (isCurrent) {
      const ch = current[i] ?? '';
      out.push({
        letter: ch,
        state: ch ? 'tbd' : 'empty',
        pop: ch !== '' && i === s.lastTypedIndex,
        flip: false,
        dance: false,
      });
    } else {
      out.push({ letter: '', state: 'empty', pop: false, flip: false, dance: false });
    }
  }
  return out;
}

export function Board({ s }: BoardProps) {
  const rows: number[] = [];
  for (let r = 0; r < s.maxGuesses; r++) rows.push(r);

  return (
    <section
      id="game-board"
      class="gb-board"
      role="grid"
      aria-label={tFa('gameBoard.boardLabel')}
      style={`--gb-len:${s.wordLength}`}
    >
      {rows.map((r) => (
        <div
          key={r}
          class="gb-row"
          role="row"
          aria-label={tFa('gameBoard.rowLabel', { row: r + 1 })}
          data-shake={s.shakeRow === r ? 'true' : undefined}
        >
          {rowTiles(s, r).map((tile, i) => (
            <Tile
              key={i}
              letter={tile.letter}
              state={tile.state}
              index={i}
              pop={tile.pop}
              flip={tile.flip}
              dance={tile.dance}
              label={tile.letter || tFa('gameBoard.emptyTile')}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
