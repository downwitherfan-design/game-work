/** BottomNav — ناوبری پایین با آیتم‌های ≥44px و حالت فعال (aria-current). */
import type { JSX } from 'preact';

export interface BottomNavItem {
  id: string;
  label: string;
  /** ایموجی/نویسه‌ی آیکون — بدون وابستگی به فونت آیکون */
  icon: string;
}

export type BottomNavVariant = 'default';

export interface BottomNavProps {
  items: BottomNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  variant?: BottomNavVariant;
  class?: string;
}

export function BottomNav({
  items,
  activeId,
  onSelect,
  class: className,
}: BottomNavProps): JSX.Element {
  return (
    <nav class={['dor-bottomnav', className ?? ''].filter(Boolean).join(' ')} data-dor="bottomnav">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          class={[
            'dor-bottomnav__item',
            item.id === activeId ? 'dor-bottomnav__item--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={item.id === activeId ? 'page' : undefined}
          onClick={() => onSelect?.(item.id)}
        >
          <span class="dor-bottomnav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span class="dor-bottomnav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
