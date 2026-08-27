// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { createEventBus, createMemoryStorage, createTranslator } from '@dordaneh/contracts';
import type { LocaleMessages, PuzzleState } from '@dordaneh/contracts';
import fa from '../locales/fa.json';
import { DuelScreen, createDuelStore, createMockDuelApi } from '../src/index';
import type { DuelBoardSlotProps } from '../src/index';

const t = createTranslator(fa as LocaleMessages);

function flush(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mount(ui: preact.VNode): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(ui, host);
  return host;
}

function wonPuzzle(guessCount: number): PuzzleState {
  return {
    puzzleId: 'duel-x',
    wordLength: 6,
    maxGuesses: 6,
    guesses: Array.from({ length: guessCount }, () => ({
      guess: 'دردانه',
      states: ['correct', 'correct', 'correct', 'correct', 'correct', 'correct'],
    })),
    status: 'won',
    hintsUsed: 0,
    startedAt: 0,
    finishedAt: 45_000,
  };
}

function setup(opts: { featureEnabled?: boolean; api?: ReturnType<typeof createMockDuelApi> } = {}) {
  const api = opts.api ?? createMockDuelApi({ latencyMs: 0 });
  const storage = createMemoryStorage();
  const store = createDuelStore({
    api,
    storage,
    bus: createEventBus(),
    featureEnabled: opts.featureEnabled ?? true,
  });
  return { api, storage, store };
}

describe('DuelScreen — رندر حالت‌ها', () => {
  it('فلگ خاموش → پیام «به‌زودی» و هیچ دکمه‌ی ساخت', async () => {
    const { store } = setup({ featureEnabled: false });
    const host = mount(<DuelScreen store={store} t={t} path="/duel" />);
    await flush();
    expect(host.querySelector('#duel-disabled')).toBeTruthy();
    expect(host.querySelector('#duel-create-btn')).toBeNull();
    expect(host.textContent).toContain('دوئل به‌زودی');
  });

  it('RTL و دکمه‌ی ساخت در landing', async () => {
    const { store } = setup();
    const host = mount(<DuelScreen store={store} t={t} path="/duel" />);
    await flush();
    const main = host.querySelector('#duel-screen')!;
    expect(main.getAttribute('dir')).toBe('rtl');
    expect(main.getAttribute('data-phase')).toBe('landing');
    expect(host.querySelector('#duel-create-btn')?.textContent).toBe('شروع دوئل جدید');
  });

  it('کلیک ساخت دوئل → solving با دکمه‌ی دعوت + اسلات برد', async () => {
    const { store } = setup();
    const boardCalls: DuelBoardSlotProps[] = [];
    const host = mount(
      <DuelScreen
        store={store}
        t={t}
        path="/duel"
        renderBoard={(p) => {
          boardCalls.push(p);
          return <div id="fake-board" />;
        }}
      />,
    );
    await flush();
    (host.querySelector('#duel-create-btn') as HTMLButtonElement).click();
    await flush(10);
    expect(host.querySelector('#duel-share-invite-btn')).toBeTruthy();
    expect(host.querySelector('#fake-board')).toBeTruthy();
    expect(boardCalls[0]).toMatchObject({ mode: 'duel' });
    expect(boardCalls[0]!.seed).toBeGreaterThan(0);
  });

  it('بدون renderBoard → پیام fallback (نه کرش)', async () => {
    const { store } = setup();
    const host = mount(<DuelScreen store={store} t={t} path="/duel" />);
    await flush();
    (host.querySelector('#duel-create-btn') as HTMLButtonElement).click();
    await flush(10);
    expect(host.textContent).toContain('صفحه‌ی بازی هنوز وصل نشده');
  });

  it('🔒 ضد اسپویل: مهمان قبل از حل هیچ آماری از A نمی‌بیند', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const created = await api.createDuel('anon-A', 'آرش');
    const duelId = created.data!.duelId;
    await api.submitResult(duelId, 'anon-A', 2, 30_000);

    const { store } = setup({ api });
    const host = mount(<DuelScreen store={store} t={t} path={`/duel/${duelId}`} />);
    await flush(10);
    const text = host.textContent ?? '';
    expect(host.querySelector('#duel-invited')).toBeTruthy();
    expect(text).toContain('حریفت منتظرته');
    expect(text).toContain('آرش'); // فقط نام
    // هیچ نشانی از عملکرد A: نه تعداد حدس، نه زمان، نه گرید
    expect(text).not.toContain('۲');
    expect(text).not.toContain('حدس');
    expect(text).not.toContain('🟩');
    expect(host.querySelector('#duel-comparison')).toBeNull();
  });

  it('پایان هر دو طرف → صفحه‌ی نتیجه با مقایسه، پیام محترمانه‌ی باخت و دکمه‌ی انتقام', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const created = await api.createDuel('anon-A', 'آرش');
    const duelId = created.data!.duelId;
    await api.submitResult(duelId, 'anon-A', 2, 30_000);

    const { store, storage } = setup({ api });
    const host = mount(
      <DuelScreen store={store} t={t} path={`/duel/${duelId}`} storage={storage} />,
    );
    await flush(10);
    (host.querySelector('#duel-accept-btn') as HTMLButtonElement).click();
    await flush();
    await store.submitPuzzleResult(wonPuzzle(4)); // B با ۴ حدس → باخت به ۲ حدس A
    await flush(10);

    const text = host.textContent ?? '';
    expect(host.querySelector('#duel-result')).toBeTruthy();
    expect(text).toContain('چه دوئلی! 🤝 دور بعد مال توئه'); // شکست محترمانه (SDT)
    expect(host.querySelector('#duel-comparison')).toBeTruthy();
    expect(text).toContain('۴ حدس');
    expect(text).toContain('۲ حدس');
    expect(host.querySelector('#duel-rematch-btn')?.textContent).toContain('انتقام');
    expect(host.querySelector('#duel-series')?.textContent).toContain('سری دوئل با آرش');
  });

  it('دوئل منقضی → صفحه‌ی expired با دکمه‌ی دوئل جدید', async () => {
    let now = 1_000_000;
    const api = createMockDuelApi({ latencyMs: 0, now: () => now });
    const created = await api.createDuel('anon-A', 'آرش');
    now += 73 * 3600 * 1000;

    const { store } = setup({ api });
    const host = mount(<DuelScreen store={store} t={t} path={`/duel/${created.data!.duelId}`} />);
    await flush(10);
    expect(host.querySelector('#duel-expired')).toBeTruthy();
    expect(host.textContent).toContain('منقضی');
  });

  it('خطا → role=alert با دکمه‌ی تلاش دوباره', async () => {
    const { store } = setup();
    const host = mount(<DuelScreen store={store} t={t} path="/duel/ghost" />);
    await flush(10);
    const alert = host.querySelector('#duel-error')!;
    expect(alert.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#duel-retry-btn')).toBeTruthy();
  });

  it('share از دکمه‌ی دعوت → callback با inviteUrl', async () => {
    const { store } = setup();
    const shared: string[] = [];
    const host = mount(
      <DuelScreen store={store} t={t} path="/duel" onShareInvite={(u) => shared.push(u)} />,
    );
    await flush();
    (host.querySelector('#duel-create-btn') as HTMLButtonElement).click();
    await flush(10);
    (host.querySelector('#duel-share-invite-btn') as HTMLButtonElement).click();
    expect(shared).toHaveLength(1);
    expect(shared[0]).toContain('mock-duel');
  });
});
