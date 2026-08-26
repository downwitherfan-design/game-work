/** ProgressRing — حلقه‌ی پیشرفت SVG (stroke-dashoffset، انیمیشن CSS) با برچسب فارسی. */
import type { JSX } from 'preact';
import { toPersianDigits } from '@dordaneh/contracts';
import { t } from '../i18n';

export type ProgressRingVariant = 'default' | 'gold';

export interface ProgressRingProps {
  /** مقدار پیشرفت 0..1 */
  value: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressRingVariant;
  /** نمایش درصد فارسی در مرکز (پیش‌فرض: بله) */
  showLabel?: boolean;
  class?: string;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  variant = 'default',
  showLabel = true,
  class: className,
}: ProgressRingProps): JSX.Element {
  const clamped = Math.min(1, Math.max(0, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped);
  const percent = Math.round(clamped * 100);
  return (
    <span
      class={[
        'dor-progressring',
        variant === 'gold' ? 'dor-progressring--gold' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-dor="progressring"
    >
      <svg class="dor-progressring__svg" width={size} height={size} aria-hidden="true">
        <circle
          class="dor-progressring__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke-width={strokeWidth}
        />
        <circle
          class="dor-progressring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke-width={strokeWidth}
          stroke-dasharray={String(c)}
          stroke-dashoffset={String(offset)}
        />
      </svg>
      {showLabel ? (
        <span class="dor-progressring__label" style={{ fontSize: `${size / 4.5}px` }}>
          {t('uiKit.progress.label', { percent: toPersianDigits(percent) })}
        </span>
      ) : null}
    </span>
  );
}
