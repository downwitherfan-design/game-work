import { describe, expect, it, vi } from 'vitest';
import {
  shareImageWithFallback,
  shareTextWithFallback,
  type ShareEnv,
} from '../src/share-channels';

const TEXT = 'دُردانه 💎 #۸۱۲ — ۴/۶';
const TITLE = 'نتیجه‌ی دُردانه‌ی من';
const COPIED = 'کپی شد! تو تلگرام بفرستش 📤';

describe('shareTextWithFallback — زنجیره‌ی فالبک', () => {
  it('۱) navigator.share موجود → native', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const out = await shareTextWithFallback(TEXT, TITLE, { nativeShare }, COPIED);
    expect(out).toBe('native');
    expect(nativeShare).toHaveBeenCalledWith({ title: TITLE, text: TEXT });
  });

  it('۲) share نبود → کلیپ‌بورد + Toast هدایت به تلگرام', async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const toast = vi.fn();
    const out = await shareTextWithFallback(TEXT, TITLE, { clipboardWrite, toast }, COPIED);
    expect(out).toBe('clipboard');
    expect(clipboardWrite).toHaveBeenCalledWith(TEXT);
    expect(toast).toHaveBeenCalledWith(COPIED);
  });

  it('۳) share و کلیپ‌بورد نبودند → پنجره‌ی مستقیم t.me', async () => {
    const openUrl = vi.fn();
    const out = await shareTextWithFallback(TEXT, TITLE, { openUrl }, COPIED);
    expect(out).toBe('telegram');
    const url = new URL(openUrl.mock.calls[0]![0] as string);
    expect(url.hostname).toBe('t.me');
    expect(url.searchParams.get('text')).toBe(TEXT);
  });

  it('خطای share (غیر Abort) → به کلیپ‌بورد fall می‌کند', async () => {
    const nativeShare = vi.fn().mockRejectedValue(new Error('boom'));
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const out = await shareTextWithFallback(
      TEXT,
      TITLE,
      { nativeShare, clipboardWrite },
      COPIED,
    );
    expect(out).toBe('clipboard');
  });

  it('AbortError (کاربر شیت را بست) → failed بدون فالبک مزاحم', async () => {
    const abort = new Error('user cancelled');
    abort.name = 'AbortError';
    const nativeShare = vi.fn().mockRejectedValue(abort);
    const clipboardWrite = vi.fn();
    const out = await shareTextWithFallback(
      TEXT,
      TITLE,
      { nativeShare, clipboardWrite },
      COPIED,
    );
    expect(out).toBe('failed');
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it('خطای کلیپ‌بورد → به تلگرام fall می‌کند', async () => {
    const clipboardWrite = vi.fn().mockRejectedValue(new Error('denied'));
    const openUrl = vi.fn();
    const out = await shareTextWithFallback(TEXT, TITLE, { clipboardWrite, openUrl }, COPIED);
    expect(out).toBe('telegram');
  });

  it('محیط کاملاً خالی → failed', async () => {
    const out = await shareTextWithFallback(TEXT, TITLE, {}, COPIED);
    expect(out).toBe('failed');
  });
});

describe('shareImageWithFallback — اشتراک تصویر کارت', () => {
  const blob = new Blob(['png'], { type: 'image/png' });

  it('share فایل پشتیبانی‌شده → native', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const out = await shareImageWithFallback(blob, 'card.png', TITLE, { nativeShare, canShare });
    expect(out).toBe('native');
    const call = nativeShare.mock.calls[0]![0] as { files: File[] };
    expect(call.files[0]!.name).toBe('card.png');
    expect(call.files[0]!.type).toBe('image/png');
  });

  it('canShare=false → دانلود', async () => {
    const nativeShare = vi.fn();
    const canShare = vi.fn().mockReturnValue(false);
    const download = vi.fn();
    const out = await shareImageWithFallback(blob, 'card.png', TITLE, {
      nativeShare,
      canShare,
      download,
    });
    expect(out).toBe('download');
    expect(nativeShare).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledWith(blob, 'card.png');
  });

  it('بدون share → دانلود مستقیم', async () => {
    const download = vi.fn();
    const out = await shareImageWithFallback(blob, 'c.png', TITLE, { download });
    expect(out).toBe('download');
  });

  it('AbortError → failed (بدون دانلود مزاحم)', async () => {
    const abort = new Error('x');
    abort.name = 'AbortError';
    const nativeShare = vi.fn().mockRejectedValue(abort);
    const download = vi.fn();
    const out = await shareImageWithFallback(blob, 'c.png', TITLE, { nativeShare, download });
    expect(out).toBe('failed');
    expect(download).not.toHaveBeenCalled();
  });

  it('محیط خالی → failed', async () => {
    const out = await shareImageWithFallback(blob, 'c.png', TITLE, {});
    expect(out).toBe('failed');
  });
});
