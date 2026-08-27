import { describe, expect, it, vi } from 'vitest';
import { createEventBus, type AppEvent } from '@dordaneh/contracts';
import { createShareApi } from '../src/share-api';
import { DEFAULT_THEME } from '../src/grid';
import { createRecordingCanvas, sampleCard, wonState } from './helpers';

function collectEvents(bus: ReturnType<typeof createEventBus>): AppEvent[] {
  const events: AppEvent[] = [];
  bus.on('share_initiated', (e) => events.push(e));
  bus.on('share_completed', (e) => events.push(e));
  return events;
}

describe('createShareApi — قرارداد ShareApi §12', () => {
  it('buildResultGrid: خروجی کامل با استریک تزریقی', () => {
    const api = createShareApi({
      getStreak: () => 12,
      gridTheme: DEFAULT_THEME,
    });
    const out = api.buildResultGrid(wonState());
    expect(out).toContain('دُردانه 💎 #۸۱۲ — ۴/۶');
    expect(out).toContain('🔥 استریک: ۱۲');
    expect(out).toContain('dordaneh.app');
  });

  it('buildResultGrid بدون getStreak → بدون خط استریک', () => {
    const api = createShareApi({ gridTheme: DEFAULT_THEME });
    expect(api.buildResultGrid(wonState())).not.toContain('استریک');
  });

  it('قالب خودکار مناسبتی از ساعت تزریقی (نوروز)', () => {
    const api = createShareApi({ now: () => new Date('2026-03-21T12:00:00Z') });
    expect(api.buildResultGrid(wonState())).toContain('🌱');
  });

  it('shareResult: native share + رویدادهای قیف آنالیتیکس', async () => {
    const bus = createEventBus();
    const events = collectEvents(bus);
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const api = createShareApi({ eventBus: bus, gridTheme: DEFAULT_THEME }, { nativeShare });
    await api.shareResult(wonState());
    expect(nativeShare).toHaveBeenCalledOnce();
    expect(events).toEqual([
      { type: 'share_initiated', surface: 'result' },
      { type: 'share_completed', surface: 'result' },
    ]);
  });

  it('shareResult ناموفق → share_completed منتشر نمی‌شود (قیف دقیق)', async () => {
    const bus = createEventBus();
    const events = collectEvents(bus);
    const api = createShareApi({ eventBus: bus, gridTheme: DEFAULT_THEME }, {});
    await api.shareResult(wonState());
    expect(events).toEqual([{ type: 'share_initiated', surface: 'result' }]);
  });

  it('shareResult: فالبک کلیپ‌بورد + Toast', async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const toast = vi.fn();
    const api = createShareApi({ gridTheme: DEFAULT_THEME }, { clipboardWrite, toast });
    await api.shareResult(wonState());
    expect(clipboardWrite).toHaveBeenCalledOnce();
    const copied = (clipboardWrite.mock.calls[0]![0] as string);
    expect(copied).toContain('دُردانه');
    expect(toast).toHaveBeenCalledWith('کپی شد! تو تلگرام بفرستش 📤');
  });

  it('shareCard: رندر استوری + share فایل + رویدادها', async () => {
    const bus = createEventBus();
    const events = collectEvents(bus);
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const api = createShareApi(
      { eventBus: bus, canvasFactory: createRecordingCanvas },
      { nativeShare, canShare },
    );
    await api.shareCard(sampleCard);
    expect(nativeShare).toHaveBeenCalledOnce();
    const files = (nativeShare.mock.calls[0]![0] as { files: File[] }).files;
    expect(files[0]!.name).toBe(`dordaneh-card-${sampleCard.id}.png`);
    expect(events).toEqual([
      { type: 'share_initiated', surface: 'card' },
      { type: 'share_completed', surface: 'card' },
    ]);
  });

  it('shareCard: فالبک دانلود از env', async () => {
    const download = vi.fn();
    const api = createShareApi({ canvasFactory: createRecordingCanvas }, { download });
    await api.shareCard(sampleCard);
    expect(download).toHaveBeenCalledOnce();
  });

  it('buildInviteLink: duel و circle طبق قرارداد', () => {
    const api = createShareApi();
    expect(api.buildInviteLink('duel', 'd1')).toBe('https://dordaneh.app/d/d1');
    expect(api.buildInviteLink('circle', 'c1')).toBe('https://dordaneh.app/c/c1');
  });

  it('baseUrl سفارشی در لینک‌ها اعمال می‌شود', () => {
    const api = createShareApi({ baseUrl: 'https://dev.dordaneh.app' });
    expect(api.buildInviteLink('duel', 'x')).toBe('https://dev.dordaneh.app/d/x');
  });

  it('renderCard: پیش‌نمایش post برای ShareSheet', async () => {
    const api = createShareApi({ canvasFactory: createRecordingCanvas });
    const blob = await api.renderCard(sampleCard, 'post');
    expect(blob.type).toBe('image/png');
  });
});
