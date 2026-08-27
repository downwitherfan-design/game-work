import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventBus, type AppEvent } from '@dordaneh/contracts';
import { createShareApi } from '../src/share-api';
import { mountShareSheet } from '../src/share-sheet';
import { DEFAULT_THEME } from '../src/grid';
import { createFakeContainer, type FakeElement } from './fake-dom';
import { createRecordingCanvas, sampleCard, wonState } from './helpers';

// URL.createObjectURL در Node نیست — stub با حفظ constructor اصلی
class StubURL extends URL {
  static override createObjectURL = vi.fn().mockReturnValue('blob:fake');
  static override revokeObjectURL = vi.fn();
}
beforeEach(() => {
  vi.stubGlobal('URL', StubURL);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function makeApi(bus?: ReturnType<typeof createEventBus>) {
  return createShareApi(
    {
      gridTheme: DEFAULT_THEME,
      getStreak: () => 12,
      canvasFactory: createRecordingCanvas,
      ...(bus ? { eventBus: bus } : {}),
    },
    {}, // env خالی — ShareSheet خودش window fake را مصرف می‌کند
  );
}

function buttonsOf(root: FakeElement): FakeElement[] {
  return root.queryAll((el) => el.tagName === 'BUTTON');
}

describe('mountShareSheet — UI اشتراک', () => {
  it('گرید بی‌اسپویلر را در پیش‌نمایش نشان می‌دهد + RTL', () => {
    const { container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api: makeApi(),
      state: wonState(),
    });
    const root = handle.el as unknown as FakeElement;
    expect(root.getAttribute('dir')).toBe('rtl');
    const preview = root.queryAll((el) => el.id === 'share-grid-preview')[0]!;
    expect(preview.textContent).toContain('دُردانه 💎 #۸۱۲ — ۴/۶');
    expect(preview.textContent).toContain('🟩🟩🟩🟩🟩🟩');
    expect(preview.textContent).not.toContain('دلاور'); // ضداسپویل
  });

  it('استایل فقط یک‌بار تزریق می‌شود و از توکن‌های ui-kit استفاده می‌کند', () => {
    const { doc, container } = createFakeContainer();
    mountShareSheet(container as unknown as HTMLElement, { api: makeApi(), state: wonState() });
    mountShareSheet(container as unknown as HTMLElement, { api: makeApi(), state: wonState() });
    const styles = doc.head.children.filter((c) => c.tagName === 'STYLE');
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toContain('var(--dor-font)');
    expect(styles[0]!.textContent).toContain('var(--dor-accent)');
    // هیچ hex هاردکد (خط قرمز #25)
    expect(styles[0]!.textContent).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('دکمه‌ی تلگرام: باز کردن t.me + رویدادهای قیف', () => {
    const bus = createEventBus();
    const events: AppEvent[] = [];
    bus.on('share_initiated', (e) => events.push(e));
    bus.on('share_completed', (e) => events.push(e));
    const { doc, container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api: makeApi(),
      state: wonState(),
      eventBus: bus,
    });
    const root = handle.el as unknown as FakeElement;
    const tgBtn = buttonsOf(root).find((b) => b.textContent.includes('تلگرام'))!;
    tgBtn.click();
    expect(doc.defaultView.openedUrls[0]).toContain('t.me/share/url');
    expect(events.map((e) => e.type)).toEqual(['share_initiated', 'share_completed']);
  });

  it('دکمه‌ی واتساپ: wa.me را باز می‌کند', () => {
    const { doc, container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api: makeApi(),
      state: wonState(),
    });
    const root = handle.el as unknown as FakeElement;
    buttonsOf(root)
      .find((b) => b.textContent.includes('واتساپ'))!
      .click();
    expect(doc.defaultView.openedUrls[0]).toContain('wa.me');
  });

  it('دکمه‌ی کپی: متن گرید به کلیپ‌بورد + Toast', async () => {
    const { doc, container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api: makeApi(),
      state: wonState(),
    });
    const root = handle.el as unknown as FakeElement;
    buttonsOf(root)
      .find((b) => b.textContent.includes('کپی'))!
      .click();
    await Promise.resolve();
    await Promise.resolve();
    expect(doc.defaultView.copiedTexts[0]).toContain('دُردانه');
    const toast = doc.body.queryAll((el) => el.className.includes('toast'))[0];
    expect(toast?.textContent).toContain('کپی شد');
  });

  it('دکمه‌ی اشتراک اصلی shareResult را صدا می‌زند', () => {
    const api = makeApi();
    const spy = vi.spyOn(api, 'shareResult').mockResolvedValue();
    const { container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api,
      state: wonState(),
    });
    const root = handle.el as unknown as FakeElement;
    buttonsOf(root)[0]!.click(); // دکمه‌ی primary اول است
    expect(spy).toHaveBeenCalledOnce();
  });

  it('با کارت فرهنگی: پیش‌نمایش تصویر + دکمه‌ی اشتراک کارت', async () => {
    const api = makeApi();
    const cardSpy = vi.spyOn(api, 'shareCard').mockResolvedValue();
    const { container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api,
      state: wonState(),
      card: sampleCard,
    });
    const root = handle.el as unknown as FakeElement;
    await Promise.resolve();
    await Promise.resolve();
    const img = root.queryAll((el) => el.id === 'share-card-preview')[0]!;
    expect(img.src).toBe('blob:fake');
    buttonsOf(root)
      .find((b) => b.textContent.includes('اشتراک کارت'))!
      .click();
    expect(cardSpy).toHaveBeenCalledWith(sampleCard);
  });

  it('onClose: دکمه‌ی بستن نمایش داده و صدا زده می‌شود', () => {
    const onClose = vi.fn();
    const { container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api: makeApi(),
      state: wonState(),
      onClose,
    });
    const root = handle.el as unknown as FakeElement;
    buttonsOf(root)
      .find((b) => b.textContent.includes('بستن'))!
      .click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('destroy: شیت را از DOM حذف می‌کند', () => {
    const { container } = createFakeContainer();
    const handle = mountShareSheet(container as unknown as HTMLElement, {
      api: makeApi(),
      state: wonState(),
    });
    expect(container.children).toHaveLength(1);
    handle.destroy();
    expect(container.children).toHaveLength(0);
  });
});
