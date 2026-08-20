/**
 * ShopScreen — route `/shop` (قرارداد §6، مالک: AI-11).
 *
 * UI صادقانه:
 *  - قیمت واضح از remote config (تست دو نقطه‌ی قیمتی) — بدون تخفیف جعلی
 *  - «بازگردانی خرید» همیشه در دسترس
 *  - قاب‌بندی حمایتی: «با نسخه‌ی طلایی از یک بازی مستقل ایرانی حمایت می‌کنی 💛»
 *    (هویت و معنا > فایده‌ی صرف — Belk 1988)
 *  - نشان ظریف طلایی (حلقه‌ی طلایی دور آواتار) — conspicuous consumption
 *    (Veblen 1899) بدون هیچ مزیت گیم‌پلی
 *  - فقط راحتی/محتوا/ظاهر — هرگز قدرت (خط قرمز ۱۲)
 */

import type { AnalyticsApi, Sku, TranslateFn } from '@dordaneh/contracts';
import { toPersianDigits } from '@dordaneh/contracts';
import { CATALOG, getPriceToman, type CatalogItem, type SkuKind } from '../catalog';
import type { MonetizationController } from '../controller';
import { h, renderToDom, type VNode } from './vdom';
import { ensureStylesInjected } from './styles';

export interface ShopScreenDeps {
  monetization: MonetizationController;
  t: TranslateFn;
  analytics?: Pick<AnalyticsApi, 'getRemoteConfig'>;
}

/** قیمت نمایشی با اعداد فارسی و جداکننده‌ی هزارگان. */
export function formatPrice(toman: number, t: TranslateFn): string {
  const grouped = toman.toLocaleString('en-US'); // 149,000
  return t('monetization.shop.price', { price: toPersianDigits(grouped) });
}

function buildItemCard(
  item: CatalogItem,
  deps: ShopScreenDeps,
  onBuy: (sku: Sku) => void,
): VNode {
  const { monetization, t, analytics } = deps;
  const owned = monetization.ownsSku(item.sku);
  const isGoldenItem = item.sku === 'golden';
  const price = getPriceToman(item, analytics);

  return h(
    'article',
    {
      class: `dor-shop-card${isGoldenItem ? ' dor-shop-card--golden' : ''}`,
      id: `shop-item-${item.sku}`,
    },
    h('span', { class: 'dor-shop-card__emoji', 'aria-hidden': 'true' }, item.emoji),
    h(
      'div',
      { class: 'dor-shop-card__body' },
      h('h3', { class: 'dor-shop-card__title' }, t(item.titleKey)),
      h('p', { class: 'dor-shop-card__desc' }, t(item.descKey)),
      isGoldenItem
        ? h('p', { class: 'dor-shop-card__badge' }, t('monetization.golden.badge'))
        : null,
    ),
    owned
      ? h('button', { class: 'dor-btn dor-btn--owned', disabled: 'true' },
          t('monetization.shop.owned'))
      : h(
          'button',
          {
            class: `dor-btn ${isGoldenItem ? 'dor-btn--buy-golden' : 'dor-btn--buy'}`,
            id: `shop-buy-${item.sku}`,
            onclick: () => onBuy(item.sku),
          },
          `${t('monetization.shop.buy')} · ${formatPrice(price, t)}`,
        ),
  );
}

function buildSection(
  kind: SkuKind,
  titleKey: string,
  deps: ShopScreenDeps,
  onBuy: (sku: Sku) => void,
): VNode[] {
  const items = CATALOG.filter((x) => x.kind === kind);
  return [
    h('h2', { class: 'dor-shop__section-title' }, deps.t(titleKey)),
    ...items.map((item) => buildItemCard(item, deps, onBuy)),
  ];
}

/** ساخت کل درخت ShopScreen — pure و تست‌پذیر. */
export function buildShopVNode(
  deps: ShopScreenDeps,
  onBuy: (sku: Sku) => void,
  onRestore: () => void,
): VNode {
  const { t } = deps;
  return h(
    'main',
    { class: 'dor-shop', id: 'shop-screen' },
    h('h1', { class: 'dor-shop__title' }, t('monetization.shop.title')),
    h('p', { class: 'dor-shop__subtitle' }, t('monetization.shop.subtitle')),
    ...buildSection('golden', 'monetization.shop.sectionGolden', deps, onBuy),
    h('p', { class: 'dor-shop__subtitle' }, t('monetization.shop.supporter')),
    ...buildSection('content', 'monetization.shop.sectionContent', deps, onBuy),
    ...buildSection('cosmetic', 'monetization.shop.sectionCosmetic', deps, onBuy),
    h('button', {
      class: 'dor-btn dor-btn--ghost dor-shop__restore',
      id: 'shop-restore-button',
      onclick: onRestore,
    }, t('monetization.shop.restore')),
    h('p', { class: 'dor-shop__honesty' }, t('monetization.shop.honesty')),
  );
}

export interface ShopScreenHandle {
  /** رندر مجدد (پس از خرید موفق) */
  refresh(): void;
  /** پاک‌سازی از DOM */
  destroy(): void;
}

/**
 * mount کردن ShopScreen داخل یک container — app-shell (AI-05) روی route `/shop`
 * صدا می‌زند. توست نتیجه‌ی خرید/بازگردانی داخل خود صفحه مدیریت می‌شود.
 */
export function mountShopScreen(container: HTMLElement, deps: ShopScreenDeps): ShopScreenHandle {
  const doc = container.ownerDocument;
  ensureStylesInjected(doc);

  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(message: string): void {
    const old = doc.getElementById('shop-toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const toast = doc.createElement('div');
    toast.id = 'shop-toast';
    toast.className = 'dor-shop__toast';
    toast.textContent = message;
    doc.body.appendChild(toast);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  async function onBuy(sku: Sku): Promise<void> {
    const result = await deps.monetization.purchase(sku);
    if (result === 'ok') {
      showToast(deps.t('monetization.shop.purchaseOk'));
      render();
    } else if (result === 'cancelled') {
      // انصراف کاربر محترم است — بدون اصرار، بدون گیلت‌تریپ
      showToast(deps.t('monetization.shop.purchaseCancelled'));
    } else {
      showToast(deps.t('monetization.shop.purchaseError'));
    }
  }

  async function onRestore(): Promise<void> {
    const { restored } = await deps.monetization.restorePurchases();
    showToast(
      restored.length > 0
        ? deps.t('monetization.shop.restored')
        : deps.t('monetization.shop.restoreEmpty'),
    );
    if (restored.length > 0) render();
  }

  function render(): void {
    const vnode = buildShopVNode(deps, (sku) => void onBuy(sku), () => void onRestore());
    container.replaceChildren(renderToDom(vnode, doc));
  }

  render();

  return {
    refresh: render,
    destroy(): void {
      if (toastTimer) clearTimeout(toastTimer);
      container.replaceChildren();
    },
  };
}
