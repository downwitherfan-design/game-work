/**
 * تست UI — ShopScreen، مودال رضایت، کاتالوگ، قیمت remote config.
 * روی fake DOM سبک (test/helpers.ts) — بدون وابستگی jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Sku } from '@dordaneh/contracts';
import { CATALOG, getCatalogItem, getPriceToman } from '../src/catalog';
import { createMonetization } from '../src/controller';
import { buildShopVNode, formatPrice, mountShopScreen } from '../src/ui/shop-screen';
import {
  ensureStylesInjected,
  resetStylesInjectedForTest,
  MONETIZATION_CSS,
} from '../src/ui/styles';
import { h, renderToString, renderToDom, findInTree, textContent } from '../src/ui/vdom';
import {
  makeStorage,
  makeBus,
  makeT,
  completeOnboarding,
  makeDoc,
  type FakeNode,
} from './helpers';

const t = makeT();

function makeMon(storage = makeStorage()) {
  completeOnboarding(storage);
  return createMonetization({ storage, bus: makeBus(), now: () => Date.now() });
}

describe('کاتالوگ و قیمت', () => {
  it('کاتالوگ همه‌ی ۶ SKU قرارداد را دارد و فقط راحتی/محتوا/ظاهر', () => {
    expect(CATALOG).toHaveLength(6);
    const kinds = new Set(CATALOG.map((x) => x.kind));
    expect([...kinds].sort()).toEqual(['content', 'cosmetic', 'golden']);
    expect(getCatalogItem('golden').kind).toBe('golden');
  });

  it('قیمت از remote config می‌آید؛ مقدار نامعتبر → فالبک', () => {
    const item = getCatalogItem('golden');
    expect(getPriceToman(item)).toBe(item.fallbackPriceToman);
    const analytics = { getRemoteConfig: <T,>(_k: string, _f: T): T => 199_000 as T };
    expect(getPriceToman(item, analytics)).toBe(199_000);
    const bad = { getRemoteConfig: <T,>(_k: string, _f: T): T => -5 as T };
    expect(getPriceToman(item, bad)).toBe(item.fallbackPriceToman);
    const crash = {
      getRemoteConfig: (): never => {
        throw new Error('x');
      },
    };
    expect(getPriceToman(item, crash as never)).toBe(item.fallbackPriceToman);
  });

  it('formatPrice اعداد فارسی می‌دهد', () => {
    const s = formatPrice(149000, t);
    expect(s).toContain('تومان');
    expect(s).toContain('۱۴۹');
    expect(s).not.toMatch(/149/);
  });
});

describe('vdom داخلی', () => {
  it('h/renderToString/textContent/findInTree', () => {
    const tree = h('div', { class: 'a', onclick: () => undefined }, 'x', [
      h('span', { id: 's1' }, 'y'),
      null,
      false,
    ]);
    const html = renderToString(tree);
    expect(html).toBe('<div class="a">x<span id="s1">y</span></div>');
    expect(textContent(tree)).toContain('y');
    expect(findInTree(tree, (n) => n.props.id === 's1')?.tag).toBe('span');
    expect(findInTree(tree, (n) => n.tag === 'nope')).toBeNull();
  });

  it('escape HTML در متن و attribute', () => {
    expect(renderToString(h('i', { title: 'a"b' }, '<x>&'))).toBe(
      '<i title="a&quot;b">&lt;x&gt;&amp;</i>',
    );
  });
});

describe('ShopScreen — UI صادقانه', () => {
  it('درخت شامل هر ۶ کارت + بازگردانی خرید + متن حمایتی + متن صداقت', () => {
    const mon = makeMon();
    const tree = buildShopVNode({ monetization: mon, t }, () => undefined, () => undefined);
    for (const item of CATALOG) {
      expect(findInTree(tree, (n) => n.props.id === `shop-item-${item.sku}`)).not.toBeNull();
    }
    expect(findInTree(tree, (n) => n.props.id === 'shop-restore-button')).not.toBeNull();
    const text = textContent(tree);
    expect(text).toContain('حمایت می‌کنی');
    expect(text).toContain('هیچ خریدی در حل معما کمکت نمی‌کند');
    // بدون تخفیف جعلی: هیچ نشانی از «تخفیف» در UI نیست
    expect(text).not.toContain('تخفیف');
  });

  it('آیتم خریداری‌شده «فعال ✓» می‌شود و دکمه‌ی خرید ندارد', async () => {
    const storage = makeStorage();
    const mon = makeMon(storage);
    await mon.purchase('golden');
    const tree = buildShopVNode({ monetization: mon, t }, () => undefined, () => undefined);
    expect(findInTree(tree, (n) => n.props.id === 'shop-buy-golden')).toBeNull();
    const card = findInTree(tree, (n) => n.props.id === 'shop-item-golden');
    expect(card).not.toBeNull();
    expect(textContent(card!)).toContain('فعال');
  });

  it('mount + کلیک خرید → toast موفق و رندر مجدد (fake DOM)', async () => {
    const doc = makeDoc();
    const mon = makeMon();
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const handle = mountShopScreen(container as unknown as HTMLElement, {
      monetization: mon,
      t,
    });
    const buy = container.findById('shop-buy-golden');
    expect(buy).not.toBeNull();
    (buy as FakeNode).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(mon.isGolden()).toBe(true);
    expect(doc.getElementById('shop-toast')?.textContent).toContain('مبارکه');
    // پس از رندر مجدد، دکمه‌ی خرید طلایی نیست
    expect(container.findById('shop-buy-golden')).toBeNull();
    handle.destroy();
    expect(container.childNodes).toHaveLength(0);
  });

  it('بازگردانی بدون خرید → پیام «پیدا نشد»', async () => {
    const doc = makeDoc();
    const mon = makeMon();
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    mountShopScreen(container as unknown as HTMLElement, { monetization: mon, t });
    (container.findById('shop-restore-button') as FakeNode).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(doc.getElementById('shop-toast')?.textContent).toContain('پیدا نشد');
  });

  it('onBuy با sku درست صدا زده می‌شود', () => {
    const mon = makeMon();
    const onBuy = vi.fn<(sku: Sku) => void>();
    const tree = buildShopVNode({ monetization: mon, t }, onBuy, () => undefined);
    const doc = makeDoc();
    const dom = renderToDom(tree, doc as unknown as Document) as unknown as FakeNode;
    doc.body.appendChild(dom);
    (dom.findById('shop-buy-pack_cinema') as FakeNode).click();
    expect(onBuy).toHaveBeenCalledWith('pack_cinema');
  });
});

describe('styles — تزریق و توکن‌ها', () => {
  beforeEach(() => resetStylesInjectedForTest());

  it('تزریق idempotent است', () => {
    const doc = makeDoc();
    ensureStylesInjected(doc as unknown as Document);
    ensureStylesInjected(doc as unknown as Document);
    expect(doc.head.childNodes).toHaveLength(1);
  });

  it('بدون document → no-op بدون خطا', () => {
    expect(() => ensureStylesInjected(undefined)).not.toThrow();
  });

  it('هیچ hex هاردکد رنگی در CSS نیست (خط قرمز ۲۵) — فقط var(--dor-*)', () => {
    expect(MONETIZATION_CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(MONETIZATION_CSS).toContain('var(--dor-gold)');
    expect(MONETIZATION_CSS).toContain('var(--dor-font)');
  });
});
