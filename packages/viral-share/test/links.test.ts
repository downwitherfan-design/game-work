import { describe, expect, it } from 'vitest';
import {
  buildInviteLinkUrl,
  DEFAULT_BASE_URL,
  duelChallengeText,
  telegramShareUrl,
  whatsappShareUrl,
} from '../src/links';
import { lostState, wonState } from './helpers';

describe('buildInviteLinkUrl — دیپ‌لینک دعوت', () => {
  it('duel → /d/<id>', () => {
    expect(buildInviteLinkUrl('duel', 'abc123')).toBe('https://dordaneh.app/d/abc123');
  });
  it('circle → /c/<id>', () => {
    expect(buildInviteLinkUrl('circle', 'fam-42')).toBe('https://dordaneh.app/c/fam-42');
  });
  it('baseUrl سفارشی + حذف اسلش انتهایی', () => {
    expect(buildInviteLinkUrl('duel', 'x', 'https://staging.dordaneh.app/')).toBe(
      'https://staging.dordaneh.app/d/x',
    );
  });
  it('id ناامن URL-encode می‌شود', () => {
    expect(buildInviteLinkUrl('duel', 'a/b?c')).toBe('https://dordaneh.app/d/a%2Fb%3Fc');
  });
});

describe('لینک‌های کانال', () => {
  it('telegram: url + text را ست می‌کند', () => {
    const u = new URL(telegramShareUrl('سلام 🟩', 'https://dordaneh.app/d/x'));
    expect(u.hostname).toBe('t.me');
    expect(u.pathname).toBe('/share/url');
    expect(u.searchParams.get('url')).toBe('https://dordaneh.app/d/x');
    expect(u.searchParams.get('text')).toBe('سلام 🟩');
  });
  it('telegram بدون url → دامنه‌ی پیش‌فرض (t.me الزاماً url می‌خواهد)', () => {
    const u = new URL(telegramShareUrl('متن'));
    expect(u.searchParams.get('url')).toBe(DEFAULT_BASE_URL);
  });
  it('whatsapp: text را ست می‌کند', () => {
    const u = new URL(whatsappShareUrl('گرید من'));
    expect(u.hostname).toBe('wa.me');
    expect(u.searchParams.get('text')).toBe('گرید من');
  });
});

describe('duelChallengeText — شکاف کنجکاوی (Loewenstein 1994)', () => {
  const templates = {
    won: (c: string) => `من با ${c} حدس زدم؛ تو می‌تونی؟`,
    lost: 'این معما منو شکست داد؛ تو می‌تونی؟',
  };
  it('برد → چالش شخصی با عدد فارسی', () => {
    expect(duelChallengeText(wonState(), templates)).toBe('من با ۴ حدس زدم؛ تو می‌تونی؟');
  });
  it('باخت → متن چالش باخت', () => {
    expect(duelChallengeText(lostState(), templates)).toContain('شکست داد');
  });
});
