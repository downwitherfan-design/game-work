/**
 * Card — قاب کارت فرهنگی با variantهای common | rare | legendary
 * (قاب طلایی برای legendary) + بافت کاغذی ظریف (SVG pattern inline در CSS).
 */
import type { ComponentChildren, JSX } from 'preact';
import { t } from '../i18n';

export type CardVariant = 'common' | 'rare' | 'legendary';

export interface CardProps {
  variant?: CardVariant;
  title?: string;
  /** متن اصلی (شعر/مثل/دانستنی) — یا children برای محتوای دلخواه */
  body?: string;
  /** منبع مستند (قرارداد کارت فرهنگی — اجباری در محتوا) */
  source?: string;
  /** نمایش روبان کمیابی (پیش‌فرض: بله) */
  showRibbon?: boolean;
  class?: string;
  children?: ComponentChildren;
}

export function Card({
  variant = 'common',
  title,
  body,
  source,
  showRibbon = true,
  class: className,
  children,
}: CardProps): JSX.Element {
  return (
    <article
      class={['dor-card', `dor-card--${variant}`, className ?? ''].filter(Boolean).join(' ')}
      data-dor="card"
      data-variant={variant}
    >
      {showRibbon ? (
        <span class="dor-card__ribbon">{t(`uiKit.card.rarity.${variant}`)}</span>
      ) : null}
      {title ? <h3 class="dor-card__title">{title}</h3> : null}
      {body ? <p class="dor-card__body">{body}</p> : null}
      {children}
      {source ? <p class="dor-card__source">{t('uiKit.card.sourcePrefix', { source })}</p> : null}
    </article>
  );
}
