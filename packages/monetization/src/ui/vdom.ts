/**
 * VDOM داخلی فوق‌سبک (~۷۰ خط) — آداپتور موقت تا تأیید RFC-0001 (preact).
 *
 * چرا: preact هنوز در lock مونوریپو نیست و طبق docs/deps-policy.md فقط AI-14
 * با RFC وابستگی اضافه می‌کند. خط قرمز ۲: «تا تأیید، آداپتور موقت در ماژول
 * خودت بنویس». این ماژول pure و تست‌پذیر است؛ پس از تأیید RFC، ShopScreen با
 * همین ساختار VNode به h() خود preact سوییچ می‌شود (تغییر یک‌خطی در mount).
 */

export interface VNode {
  tag: string;
  props: Record<string, unknown>;
  children: (VNode | string)[];
}

export type Child = VNode | string | null | undefined | false;

/** hyperscript سازگار با امضای h(tag, props, ...children) */
export function h(
  tag: string,
  props?: Record<string, unknown> | null,
  ...children: (Child | Child[])[]
): VNode {
  const flat: (VNode | string)[] = [];
  const push = (c: Child | Child[]): void => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) {
      for (const x of c) push(x);
      return;
    }
    flat.push(c);
  };
  for (const c of children) push(c);
  return { tag, props: props ?? {}, children: flat };
}

/** رندر VNode به DOM واقعی — event handler ها با پیشوند on (مثل onclick). */
export function renderToDom(vnode: VNode | string, doc: Document): Node {
  if (typeof vnode === 'string') return doc.createTextNode(vnode);
  const el = doc.createElement(vnode.tag);
  for (const [key, value] of Object.entries(vnode.props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      el.setAttribute('class', String(value));
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of vnode.children) {
    el.appendChild(renderToDom(child, doc));
  }
  return el;
}

/** رندر به رشته — برای تست‌های pure بدون DOM و اسنپ‌شات. */
export function renderToString(vnode: VNode | string): string {
  if (typeof vnode === 'string') return escapeHtml(vnode);
  const attrs = Object.entries(vnode.props)
    .filter(([k, v]) => v !== null && v !== undefined && v !== false && !k.startsWith('on'))
    .map(([k, v]) => ` ${k === 'class' ? 'class' : k}="${escapeHtml(String(v))}"`)
    .join('');
  const inner = vnode.children.map(renderToString).join('');
  return `<${vnode.tag}${attrs}>${inner}</${vnode.tag}>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** جستجوی VNode در درخت با پیش‌بینه — برای assertion های تست. */
export function findInTree(root: VNode, predicate: (n: VNode) => boolean): VNode | null {
  if (predicate(root)) return root;
  for (const c of root.children) {
    if (typeof c === 'string') continue;
    const found = findInTree(c, predicate);
    if (found) return found;
  }
  return null;
}

/** همه‌ی متن‌های درخت — برای تست محتوا. */
export function textContent(node: VNode | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textContent).join(' ');
}
