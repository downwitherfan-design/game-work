import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserShareEnv } from '../src/share-channels';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browserShareEnv — اتصال به APIهای واقعی مرورگر', () => {
  it('بدون navigator/window → همه undefined (محیط Node امن)', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('window', undefined);
    const env = browserShareEnv();
    expect(env.nativeShare).toBeUndefined();
    expect(env.canShare).toBeUndefined();
    expect(env.clipboardWrite).toBeUndefined();
    expect(env.openUrl).toBeUndefined();
  });

  it('navigator کامل → همه‌ی کانال‌ها bind می‌شوند', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    vi.stubGlobal('navigator', { share, canShare, clipboard: { writeText } });
    vi.stubGlobal('window', { open });

    const env = browserShareEnv();
    await env.nativeShare!({ text: 'x' });
    expect(share).toHaveBeenCalledWith({ text: 'x' });
    expect(env.canShare!({ files: [] })).toBe(true);
    await env.clipboardWrite!('متن');
    expect(writeText).toHaveBeenCalledWith('متن');
    env.openUrl!('https://t.me/x');
    expect(open).toHaveBeenCalledWith('https://t.me/x', '_blank', 'noopener');
  });

  it('navigator بدون share/clipboard → فقط openUrl', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { open: vi.fn() });
    const env = browserShareEnv();
    expect(env.nativeShare).toBeUndefined();
    expect(env.clipboardWrite).toBeUndefined();
    expect(env.openUrl).toBeDefined();
  });
});
