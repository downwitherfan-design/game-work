/**
 * Fake-DOM سبک برای تست ShareSheet در Node — بدون jsdom (صفر وابستگی جدید).
 * فقط سطحی که share-sheet.ts مصرف می‌کند.
 */

export class FakeElement {
  tagName: string;
  id = '';
  className = '';
  textContent = '';
  type = '';
  src = '';
  alt = '';
  href = '';
  download = '';
  children: FakeElement[] = [];
  parent: FakeElement | null = null;
  attributes = new Map<string, string>();
  listeners = new Map<string, Array<() => void>>();
  ownerDocument: FakeDocument;
  style: Record<string, string> = {};

  constructor(tagName: string, doc: FakeDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = doc;
  }

  appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove(): void {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((c) => c !== this);
      this.parent = null;
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, cb: () => void): void {
    const arr = this.listeners.get(type) ?? [];
    arr.push(cb);
    this.listeners.set(type, arr);
  }

  click(): void {
    for (const cb of this.listeners.get('click') ?? []) cb();
  }

  /** پیمایش عمقی برای جستجو */
  *walk(): Generator<FakeElement> {
    yield this;
    for (const c of this.children) yield* c.walk();
  }

  queryAll(pred: (el: FakeElement) => boolean): FakeElement[] {
    return [...this.walk()].filter(pred);
  }
}

export interface FakeWindow {
  open: (url: string, target?: string, features?: string) => void;
  navigator: { clipboard?: { writeText: (t: string) => Promise<void> } };
  openedUrls: string[];
  copiedTexts: string[];
}

export class FakeDocument {
  head: FakeElement;
  body: FakeElement;
  defaultView: FakeWindow;

  constructor() {
    this.head = new FakeElement('head', this);
    this.body = new FakeElement('body', this);
    const openedUrls: string[] = [];
    const copiedTexts: string[] = [];
    this.defaultView = {
      openedUrls,
      copiedTexts,
      open: (url: string) => {
        openedUrls.push(url);
      },
      navigator: {
        clipboard: {
          writeText: (t: string) => {
            copiedTexts.push(t);
            return Promise.resolve();
          },
        },
      },
    };
  }

  createElement(tag: string): FakeElement {
    return new FakeElement(tag, this);
  }

  getElementById(id: string): FakeElement | null {
    for (const root of [this.head, this.body]) {
      for (const el of root.walk()) {
        if (el.id === id) return el;
      }
    }
    return null;
  }
}

/** container آماده‌ی متصل به body */
export function createFakeContainer(): { doc: FakeDocument; container: FakeElement } {
  const doc = new FakeDocument();
  const container = doc.createElement('div');
  doc.body.appendChild(container);
  return { doc, container };
}
