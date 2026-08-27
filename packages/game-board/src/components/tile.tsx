/**
 * کاشی برد — اگر @dordaneh/ui-kit کامپوننت Tile صادر کرده باشد از آن استفاده
 * می‌کند (قرارداد §4)، وگرنه فالبک داخلی با همان توکن‌های CSS قرارداد.
 */

import type { ComponentType } from 'preact';
import type { LetterState } from '@dordaneh/contracts';
import * as uiKit from '@dordaneh/ui-kit';

export interface TileProps {
  letter: string;
  state: LetterState;
  /** ایندکس در ردیف — برای تأخیر پلکانی CSS */
  index: number;
  pop?: boolean;
  flip?: boolean;
  dance?: boolean;
  label?: string;
}

type UiKitTile = ComponentType<TileProps>;
const KitTile: UiKitTile | null =
  typeof (uiKit as { Tile?: UiKitTile }).Tile === 'function'
    ? ((uiKit as { Tile?: UiKitTile }).Tile as UiKitTile)
    : null;

export function Tile(props: TileProps) {
  if (KitTile) return <KitTile {...props} />;
  const { letter, state, index, pop, flip, dance, label } = props;
  return (
    <div
      class="gb-tile"
      role="img"
      aria-label={label ?? letter}
      data-state={flip || state === 'empty' || state === 'tbd' ? state : state}
      data-pop={pop ? 'true' : undefined}
      data-flip={flip ? 'true' : undefined}
      data-dance={dance ? 'true' : undefined}
      style={`--gb-i:${index}`}
    >
      {letter}
    </div>
  );
}
