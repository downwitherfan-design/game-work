/** دکمه — variant: primary | secondary | ghost | danger | gold. breath = میکرو-انیمیشن CTA. */
import type { ComponentChildren, JSX } from 'preact';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

export interface ButtonProps {
  variant?: ButtonVariant;
  /** میکرو-انیمیشن «نفس» برای CTA اصلی (Ware 2004 — pre-attentive) */
  breath?: boolean;
  disabled?: boolean;
  onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit';
  /** برچسب دسترس‌پذیری وقتی محتوای دکمه فقط آیکون است */
  ariaLabel?: string;
  class?: string;
  children?: ComponentChildren;
}

export function Button({
  variant = 'primary',
  breath = false,
  disabled = false,
  onClick,
  type = 'button',
  ariaLabel,
  class: className,
  children,
}: ButtonProps): JSX.Element {
  const cls = [
    'dor-btn',
    `dor-btn--${variant}`,
    breath ? 'dor-btn--breath' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      class={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      data-dor="button"
    >
      {children}
    </button>
  );
}
