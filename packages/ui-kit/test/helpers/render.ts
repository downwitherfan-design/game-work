/**
 * رندرکننده‌ی کوچک vnode → متن/ساختار برای تست بدون DOM (بدون وابستگی jsdom).
 * کامپوننت‌های تابعی را بازگشتی اجرا می‌کند و درخت را به شیء ساده تبدیل می‌کند.
 */
import type { ComponentChildren, VNode } from 'preact';

export interface RNode {
  tag: string;
  props: Record<string, unknown>;
  children: (RNode | string)[];
}

function isVNode(x: unknown): x is VNode<Record<string, unknown>> {
  return typeof x === 'object' && x !== null && 'type' in x && 'props' in x;
}

/** اجرای بازگشتی vnode (کامپوننت تابعی/کلاسی) به درخت ساده */
export function renderTree(node: ComponentChildren): (RNode | string)[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap((c) => renderTree(c));
  if (!isVNode(node)) return [];

  const { type, props } = node;
  if (typeof type === 'function') {
    // کامپوننت کلاسی؟
    const proto = (type as { prototype?: { render?: unknown } }).prototype;
    if (proto && typeof proto.render === 'function') {
      const Ctor = type as new (p: Record<string, unknown>) => { render(): ComponentChildren };
      const inst = new Ctor(props);
      (inst as { props?: unknown }).props = props;
      return renderTree(inst.render());
    }
    const fn = type as (p: Record<string, unknown>) => ComponentChildren;
    return renderTree(fn(props));
  }

  const { children, ...rest } = props as { children?: ComponentChildren } & Record<
    string,
    unknown
  >;
  return [
    {
      tag: String(type),
      props: rest,
      children: renderTree(children),
    },
  ];
}

/** اولین گره‌ی عنصری خروجی */
export function renderRoot(node: ComponentChildren): RNode {
  const tree = renderTree(node);
  const root = tree.find((n): n is RNode => typeof n !== 'string');
  if (!root) throw new Error('no element rendered');
  return root;
}

/** پیدا کردن همه‌ی گره‌ها با شرط دلخواه (پیمایش عمقی) */
export function findAll(root: RNode, pred: (n: RNode) => boolean): RNode[] {
  const out: RNode[] = [];
  const walk = (n: RNode): void => {
    if (pred(n)) out.push(n);
    for (const c of n.children) if (typeof c !== 'string') walk(c);
  };
  walk(root);
  return out;
}

/** استخراج همه‌ی متن‌های درخت */
export function textOf(root: RNode): string {
  let s = '';
  const walk = (n: RNode | string): void => {
    if (typeof n === 'string') {
      s += n;
      return;
    }
    for (const c of n.children) walk(c);
  };
  walk(root);
  return s;
}

/** کلاس‌های CSS یک گره */
export function classesOf(n: RNode): string[] {
  return String(n.props['class'] ?? '')
    .split(/\s+/)
    .filter(Boolean);
}
