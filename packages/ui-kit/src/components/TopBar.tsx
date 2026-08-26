/** TopBar — نوار بالای صفحه: عنوان وسط + اسلات‌های ابتدا/انتها (RTL-first). */
import type { ComponentChildren, JSX } from 'preact';

export type TopBarVariant = 'default' | 'transparent';

export interface TopBarProps {
  title?: string;
  /** اسلات سمت شروع (در RTL = راست) */
  start?: ComponentChildren;
  /** اسلات سمت پایان (در RTL = چپ) */
  end?: ComponentChildren;
  variant?: TopBarVariant;
  class?: string;
}

export function TopBar({
  title,
  start,
  end,
  variant = 'default',
  class: className,
}: TopBarProps): JSX.Element {
  return (
    <header
      class={['dor-topbar', `dor-topbar--${variant}`, className ?? ''].filter(Boolean).join(' ')}
      data-dor="topbar"
    >
      <div class="dor-topbar__side">{start}</div>
      {title ? <h1 class="dor-topbar__title">{title}</h1> : null}
      <div class="dor-topbar__side">{end}</div>
    </header>
  );
}
