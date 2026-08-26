/**
 * Tile — خانه‌ی حرف با stateهای قرارداد (LetterState) + flip سه‌بعدی CSS
 * (فقط transform/opacity) + pop هنگام تایپ + الگوی شکل کوررنگی (● correct / ─ present).
 * تأخیر پلکانی flip با پراپ flipDelayMs (الگوی Wordle — تعلیق پاداش).
 */
import type { JSX } from 'preact';
import type { LetterState } from '@dordaneh/contracts';
import { t } from '../i18n';

export interface TileProps {
  /** حرف فارسی نمایش‌داده‌شده (نرمال‌شده توسط فراخواننده) */
  letter?: string;
  /** state قراردادی: empty | tbd | correct | present | absent */
  variant?: LetterState;
  /** تأخیر پلکانی flip به میلی‌ثانیه (مثلاً index * 250) */
  flipDelayMs?: number;
  /** اندازه‌ی خانه به پیکسل (پیش‌فرض 52؛ حداقل لمس 44 در CSS تضمین می‌شود) */
  size?: number;
  class?: string;
}

const CB_MARK: Partial<Record<LetterState, string>> = {
  correct: '●',
  present: '─',
};

export function Tile({
  letter = '',
  variant = 'empty',
  flipDelayMs = 0,
  size,
  class: className,
}: TileProps): JSX.Element {
  const style: JSX.CSSProperties = { '--dor-flip-delay': `${flipDelayMs}ms` } as JSX.CSSProperties;
  if (size !== undefined) {
    style.inlineSize = `${size}px`;
    style.blockSize = `${size}px`;
  }
  const mark = CB_MARK[variant];
  return (
    <span
      class={['dor-tile', `dor-tile--${variant}`, className ?? ''].filter(Boolean).join(' ')}
      style={style}
      role="img"
      aria-label={`${letter || '—'}: ${t(`uiKit.tile.state.${variant}`)}`}
      data-dor="tile"
      data-state={variant}
    >
      <span class="dor-tile__inner" aria-hidden="true">
        <span class="dor-tile__face dor-tile__face--front">{letter}</span>
        <span class="dor-tile__face dor-tile__face--back">
          {letter}
          {mark ? <span class="dor-tile__cbmark">{mark}</span> : null}
        </span>
      </span>
    </span>
  );
}
