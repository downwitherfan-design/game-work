/**
 * ابزارهای مشترک تست — StorageApi حافظه‌ای + fake DOM فوق‌سبک.
 * (happy-dom در مونوریپو نیست — سیاست وابستگی سخت‌گیرانه؛ این fake فقط
 * سطحی که renderToDom/mountShopScreen لازم دارند را پیاده می‌کند.)
 */

import { createMemoryStorage, createEventBus, createTranslator } from '@dordaneh/contracts';
import type { StorageApi, EventBus, TranslateFn, LocaleMessages } from '@dordaneh/contracts';
import faMessages from '../locales/fa.json';

export function makeStorage(): StorageApi {
  return createMemoryStorage();
}

export function makeBus(): EventBus {
  return createEventBus();
}

export function makeT(): TranslateFn {
  return createTranslator(faMessages as LocaleMessages);
}

/** پروفایل «جلسه‌ی اول تمام شده» — پیش‌نیاز اکثر تست‌های تبلیغ. */
export function completeOnboarding(storage: StorageApi): void {
  storage.set('dor.profile', { onboardingDone: true });
}

// ---------------------------------------------------------------------------
// Fake DOM
// ---------------------------------------------------------------------------

type Listener = (e: FakeEvent) => void;

export interface FakeEvent {
  type: string;
  stopPropagation(): void;
  __stopped?: boolean;
}

export class FakeNode {
  nodeType: number;
  textValue = '';
  tag = '';
  id = '';
  className = '';
  attributes = new Map<string, string>();
  childNodes: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  listeners = new Map<string, Listener[]>();
  ownerDocument: FakeDocument;
  disabled = false;
  private _textContent: string | null = null;

  constructor(doc: FakeDocument, nodeType: number, tag = '') {
    this.ownerDocument = doc;
    this.nodeType = nodeType;
    this.tag = tag.toUpperCase();
  }

  appendChild(child: FakeNode): FakeNode {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child: FakeNode): FakeNode {
    const i = this.childNodes.indexOf(child);
    if (i >= 0) this.childNodes.splice(i, 1);
    child.parentNode = null;
    return child;
  }

  replaceChildren(...nodes: FakeNode[]): void {
    for (const c of [...this.childNodes]) this.removeChild(c);
    for (const n of nodes) this.appendChild(n);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, cb: Listener): void {
    const arr = this.listeners.get(type) ?? [];
    arr.push(cb);
    this.listeners.set(type, arr);
  }

  /** dispatch ساده با bubbling و پشتیبانی stopPropagation */
  click(): void {
    const event: FakeEvent = {
      type: 'click',
      __stopped: false,
      stopPropagation(): void {
        this.__stopped = true;
      },
    };
    // مسیر از خود نود تا ریشه
    let node: FakeNode | null = this;
    while (node) {
      for (const cb of node.listeners.get('click') ?? []) cb(event);
      if (event.__stopped) break;
      node = node.parentNode;
    }
  }

  set textContent(v: string) {
    this._textContent = v;
    this.childNodes = [];
  }

  get textContent(): string {
    if (this.nodeType === 3) return this.textValue;
    if (this._textContent !== null && this.childNodes.length === 0) return this._textContent;
    return this.childNodes.map((c) => c.textContent).join('');
  }

  /** جستجوی عمقی id */
  findById(id: string): FakeNode | null {
    if (this.id === id) return this;
    for (const c of this.childNodes) {
      const f = c.findById(id);
      if (f) return f;
    }
    return null;
  }

  /** همه‌ی نودها با پیش‌بینه */
  findAll(pred: (n: FakeNode) => boolean, out: FakeNode[] = []): FakeNode[] {
    if (pred(this)) out.push(this);
    for (const c of this.childNodes) c.findAll(pred, out);
    return out;
  }
}

export class FakeDocument {
  body: FakeNode;
  head: FakeNode;

  constructor() {
    this.body = new FakeNode(this, 1, 'body');
    this.head = new FakeNode(this, 1, 'head');
  }

  createElement(tag: string): FakeNode {
    return new FakeNode(this, 1, tag);
  }

  createTextNode(text: string): FakeNode {
    const n = new FakeNode(this, 3);
    n.textValue = text;
    return n;
  }

  getElementById(id: string): FakeNode | null {
    return this.body.findById(id) ?? this.head.findById(id);
  }
}

export function makeDoc(): FakeDocument {
  return new FakeDocument();
}
