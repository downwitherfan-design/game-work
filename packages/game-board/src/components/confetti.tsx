/**
 * کانفتی برد — اگر ui-kit کامپوننت Confetti صادر کند از آن استفاده می‌شود؛
 * وگرنه فالبک CSS سبک (بدون canvas، فقط transform/opacity).
 */

import type { ComponentType } from 'preact';
import { useMemo } from 'preact/hooks';
import * as uiKit from '@dordaneh/ui-kit';

/** کامپوننت Confetti پکیج ui-kit (AI-04) — پراپ `active` اجباری است */
type UiKitConfetti = ComponentType<{ active: boolean }>;
const kitExport = (uiKit as unknown as Record<string, unknown>)['Confetti'];
const KitConfetti: UiKitConfetti | null =
  typeof kitExport === 'function' ? (kitExport as unknown as UiKitConfetti) : null;

const COLORS = [
  'var(--dor-correct)',
  'var(--dor-present)',
  'var(--dor-accent)',
  'var(--dor-gold)',
] as const;

const PIECES = 36;

/** شبه‌تصادفی قطعی — رندر پایدار بین فریم‌ها */
function prand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Confetti() {
  if (KitConfetti) return <KitConfetti active={true} />;
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x: Math.round(prand(i, 1) * 100),
        d: Math.round(prand(i, 2) * 900),
        c: COLORS[i % COLORS.length] as string,
      })),
    [],
  );
  return (
    <div class="gb-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i} style={`--gb-x:${p.x}%;--gb-d:${p.d}ms;--gb-c:${p.c}`} />
      ))}
    </div>
  );
}
