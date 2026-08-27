import { describe, it, expect } from 'vitest';
import type { CultureCard } from '@dordaneh/contracts';
import { createCultureApi, cultureApi, shamsiMMDDForPuzzle } from '../src/index';

function card(partial: Partial<CultureCard> & { id: string }): CultureCard {
  return {
    kind: 'fact',
    title: 'دانستنی',
    body: `متن ${partial.id}`,
    source: 'منبع آزمایشی',
    shareCaption: 'کپشن آزمایشی',
    ...partial,
  };
}

describe('shamsiMMDDForPuzzle', () => {
  it('معمای ۱ = 2026-09-01 میلادی = ۱۰ شهریور', () => {
    expect(shamsiMMDDForPuzzle(1)).toBe('06-10');
  });

  it('یلدا: 2026-12-21 میلادی = ۳۰ آذر = معمای ۱۱۲', () => {
    // 2026-09-01 → 2026-12-21 = ۱۱۱ روز بعد → puzzleNumber = 112
    expect(shamsiMMDDForPuzzle(112)).toBe('09-30');
  });

  it('نوروز: 2027-03-21 میلادی = ۱ فروردین = معمای ۲۰۲', () => {
    expect(shamsiMMDDForPuzzle(202)).toBe('01-01');
  });

  it('ورودی نامعتبر به معمای ۱ سقوط می‌کند', () => {
    expect(shamsiMMDDForPuzzle(0)).toBe('06-10');
    expect(shamsiMMDDForPuzzle(-5)).toBe('06-10');
    expect(shamsiMMDDForPuzzle(Number.NaN)).toBe('06-10');
  });

  it('اعشار به کف گرد می‌شود', () => {
    expect(shamsiMMDDForPuzzle(1.9)).toBe('06-10');
  });
});

describe('getCardForPuzzle — اولویت انتخاب', () => {
  const occasionYalda = card({
    id: 'occ-001',
    kind: 'occasion',
    occasionDate: '09-30',
    body: 'کارت یلدا',
  });
  const relatedCard = card({ id: 'fct-001', relatedWord: 'دردانه', body: 'کارت مرتبط' });
  const plain1 = card({ id: 'prv-001', kind: 'proverb', body: 'مثل ۱' });
  const plain2 = card({ id: 'poe-001', kind: 'poem', body: 'شعر ۱' });
  const api = createCultureApi([occasionYalda, relatedCard, plain1, plain2]);

  it('۱) مناسبت امروز بر همه مقدم است — حتی بر relatedWord', () => {
    expect(api.getCardForPuzzle(112, 'دردانه').id).toBe('occ-001');
  });

  it('۲) relatedWord === جواب معما در روز عادی', () => {
    expect(api.getCardForPuzzle(5, 'دردانه').id).toBe('fct-001');
  });

  it('relatedWord با جواب نانرمال هم match می‌شود (نرمال‌سازی قرارداد)', () => {
    expect(api.getCardForPuzzle(5, 'دُردانِه').id).toBe('fct-001');
  });

  it('۳) چرخش قطعی: همان شماره → همان کارت؛ مناسبت‌ها در چرخش نیستند', () => {
    const a = api.getCardForPuzzle(7, 'خورشید');
    const b = api.getCardForPuzzle(7, 'خورشید');
    expect(a.id).toBe(b.id);
    expect(a.occasionDate).toBeUndefined();
  });

  it('چرخش در روزهای متوالی kind را عوض می‌کند (پرهیز از یکنواختی)', () => {
    const k1 = api.getCardForPuzzle(2, 'خورشید').kind;
    const k2 = api.getCardForPuzzle(3, 'خورشید').kind;
    expect(k1).not.toBe(k2);
  });

  it('puzzleNumber نامعتبر کرش نمی‌کند', () => {
    expect(() => api.getCardForPuzzle(Number.NaN, 'خورشید')).not.toThrow();
    expect(() => api.getCardForPuzzle(-3, '')).not.toThrow();
  });

  it('چند کارت با relatedWord یکسان → انتخاب قطعی بین آن‌ها', () => {
    const r2 = card({ id: 'fct-002', relatedWord: 'دردانه', body: 'مرتبط ۲' });
    const api2 = createCultureApi([relatedCard, r2, plain1]);
    const pick = api2.getCardForPuzzle(4, 'دردانه');
    expect(['fct-001', 'fct-002']).toContain(pick.id);
    expect(api2.getCardForPuzzle(4, 'دردانه').id).toBe(pick.id);
  });

  it('استخر خالی → خطای قابل فهم', () => {
    const empty = createCultureApi([]);
    expect(() => empty.getCardForPuzzle(1, 'خورشید')).toThrow();
  });
});

describe('getAlbum', () => {
  it('کل کارت‌ها را با total درست برمی‌گرداند و کپی می‌دهد', () => {
    const cards = [card({ id: 'fct-001' }), card({ id: 'fct-002', body: 'متن دوم' })];
    const api = createCultureApi(cards);
    const album = api.getAlbum();
    expect(album.total).toBe(2);
    expect(album.cards).toHaveLength(2);
    album.cards.pop();
    expect(api.getAlbum().total).toBe(2);
  });
});

describe('cultureApi روی داده‌ی رسمی', () => {
  it('برای هر شماره معما یک کارت معتبر می‌دهد', () => {
    for (const n of [1, 2, 3, 50, 112, 202, 365, 1000]) {
      const c = cultureApi.getCardForPuzzle(n, 'خورشید');
      expect(c.id).toBeTruthy();
      expect(c.source).toBeTruthy();
      expect(c.shareCaption.length).toBeLessThanOrEqual(140);
    }
  });

  it('در روز یلدا (معمای ۱۱۲) کارت مناسبت یلدا می‌آید', () => {
    const c = cultureApi.getCardForPuzzle(112, 'خورشید');
    expect(c.occasionDate).toBe('09-30');
  });

  it('در نوروز (معمای ۲۰۲) کارت مناسبت نوروز می‌آید', () => {
    const c = cultureApi.getCardForPuzzle(202, 'خورشید');
    expect(c.occasionDate).toBe('01-01');
  });

  it('آلبوم رسمی خالی نیست', () => {
    expect(cultureApi.getAlbum().total).toBeGreaterThan(0);
  });
});
