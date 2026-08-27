/**
 * موزاییک هفتگی — کاشی‌کاری ایرانی SVG با ۷ قطعه (ستاره‌ی ۶پر + مرکز، الگوی گره).
 * هر روز استریک = یک قطعه؛ هر ۷ روز = یک کاشی کامل در گالری.
 * مبنا: اثر پیشرفت اعطاشده + شیب هدف (Nunes & Drèze 2006; Kivetz et al. 2006).
 * رنگ‌ها فقط از توکن‌های قراردادی (خط قرمز ۲۵). طرح هر کاشی با index کمی می‌چرخد
 * تا گالری یکنواخت نشود (قطعی — بدون تصادف).
 */
import type { VNode } from 'preact';

export interface MosaicTileProps {
  /** شماره‌ی کاشی (برای تنوع قطعی طرح) */
  index: number;
  /** قطعات چیده‌شده ۰..۷ */
  pieces: number;
  size?: number;
  /** کاشی در حال ساخت (قاب نقطه‌چین) */
  inProgress?: boolean;
}

/** رأس‌های شش‌ضلعی حول مرکز */
function hexPoint(cx: number, cy: number, r: number, i: number, rot: number): [number, number] {
  const a = (Math.PI / 3) * i + rot;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function MosaicTile(props: MosaicTileProps): VNode {
  const size = props.size ?? 64;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.42;
  const r = size * 0.2;
  const rot = ((props.index % 6) * Math.PI) / 18; // چرخش ملایم قطعی
  const petals: string[] = [];
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = hexPoint(cx, cy, R, i, rot);
    const [x2, y2] = hexPoint(cx, cy, R, i + 1, rot);
    const [ix1, iy1] = hexPoint(cx, cy, r, i, rot);
    const [ix2, iy2] = hexPoint(cx, cy, r, i + 1, rot);
    petals.push(
      `M ${ix1.toFixed(1)} ${iy1.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix2.toFixed(1)} ${iy2.toFixed(1)} Z`,
    );
  }
  const palette = ['var(--dor-accent)', 'var(--dor-correct)', 'var(--dor-present)'];
  const done = Math.min(7, Math.max(0, props.pieces));

  return (
    <svg
      class="mr-mosaic"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label=""
    >
      <rect
        x="1"
        y="1"
        width={size - 2}
        height={size - 2}
        rx={size / 8}
        fill="none"
        stroke={props.inProgress ? 'var(--dor-absent)' : 'var(--dor-gold)'}
        stroke-width="1.5"
        stroke-dasharray={props.inProgress ? '4 3' : undefined}
      />
      {petals.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={i < done ? (palette[(i + props.index) % palette.length] as string) : 'none'}
          stroke="var(--dor-absent)"
          stroke-opacity="0.3"
          stroke-width="0.8"
          style="transition: fill .5s ease"
        />
      ))}
      {/* قطعه‌ی هفتم: ستاره‌ی مرکزی */}
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.85}
        fill={done >= 7 ? 'var(--dor-gold)' : 'none'}
        stroke="var(--dor-absent)"
        stroke-opacity="0.3"
        stroke-width="0.8"
        style="transition: fill .5s ease"
      />
    </svg>
  );
}
