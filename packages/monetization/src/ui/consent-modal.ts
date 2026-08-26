/**
 * پیش‌مودال شفاف رضایت تبلیغ — «تماشای ویدئو = ۱ راهنما — قبوله؟»
 *
 * ضد dark pattern (خط قرمز پرامپت AI-11):
 *  - دو دکمه‌ی هم‌اندازه و هم‌وزن بصری: «باشه، ببینم» / «نه، ممنون»
 *  - کلیک روی پس‌زمینه = رد (خروج آسان، بدون گیر انداختن)
 *  - بدون شمارنده‌ی جعلی، بدون فشار زمانی
 *  - نمایش صادقانه‌ی فرصت باقی‌مانده‌ی امروز (سقف ۳)
 */

import type { RewardedPlacement, StorageApi, TranslateFn } from '@dordaneh/contracts';
import { toPersianDigits } from '@dordaneh/contracts';
import type { ConsentPresenter } from '../types';
import { adsRemainingToday } from '../ad-policy';
import { h, renderToDom, type VNode } from './vdom';
import { ensureStylesInjected } from './styles';

/** ساخت درخت VNode مودال — pure و تست‌پذیر. */
export function buildConsentVNode(
  placement: RewardedPlacement,
  remainingToday: number,
  t: TranslateFn,
  onAccept: () => void,
  onDecline: () => void,
): VNode {
  return h(
    'div',
    { class: 'dor-consent__backdrop', id: 'reward-consent-backdrop', onclick: onDecline },
    h(
      'section',
      {
        class: 'dor-consent',
        id: 'reward-consent-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'reward-consent-title',
        onclick: (e: Event) => e.stopPropagation(),
      },
      h('h2', { class: 'dor-consent__title', id: 'reward-consent-title' },
        t(`monetization.consent.title.${placement}`)),
      h('p', { class: 'dor-consent__body' }, t(`monetization.consent.body.${placement}`)),
      h('p', { class: 'dor-consent__remaining' },
        t('monetization.consent.remaining', { n: toPersianDigits(remainingToday) })),
      h(
        'div',
        { class: 'dor-consent__actions' },
        h('button', { class: 'dor-btn dor-btn--ghost', id: 'reward-consent-decline', onclick: onDecline },
          t('monetization.consent.decline')),
        h('button', { class: 'dor-btn dor-btn--buy', id: 'reward-consent-accept', onclick: onAccept },
          t('monetization.consent.accept')),
      ),
    ),
  );
}

/**
 * ساخت ConsentPresenter مبتنی بر DOM — تزریق به کنترلر.
 * در محیط بدون DOM (SSR/تست node): همیشه false (تبلیغ نمایش داده نمی‌شود).
 */
export function createDomConsentPresenter(
  storage: StorageApi,
  t: TranslateFn,
  doc?: Document,
): ConsentPresenter {
  return (placement: RewardedPlacement): Promise<boolean> => {
    const d = doc ?? (typeof document !== 'undefined' ? document : undefined);
    if (!d) return Promise.resolve(false);
    ensureStylesInjected(d);
    return new Promise<boolean>((resolve) => {
      let host: Node | null = null;
      const done = (answer: boolean): void => {
        if (host && host.parentNode) host.parentNode.removeChild(host);
        host = null;
        resolve(answer);
      };
      const vnode = buildConsentVNode(
        placement,
        adsRemainingToday(storage, Date.now()),
        t,
        () => done(true),
        () => done(false),
      );
      host = renderToDom(vnode, d);
      d.body.appendChild(host);
    });
  };
}
