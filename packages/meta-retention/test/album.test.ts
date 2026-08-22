import { describe, expect, it } from 'vitest';
import {
  albumProgress,
  createInitialAlbum,
  discoverCard,
  dueReviews,
  ENDOWED_CARDS,
  grantEndowedCards,
  markReviewed,
  REVIEW_BATCH,
  REVIEW_INTERVALS,
  sanitizeAlbum,
} from '../src/album';

describe('discoverCard', () => {
  it('کشف جدید + برنامه‌ریزی مرور فردا', () => {
    const r = discoverCard(createInitialAlbum(), 'c1', 100);
    expect(r.isNew).toBe(true);
    expect(r.state.discovered['c1']).toEqual({ puzzleNumber: 100 });
    expect(r.state.review['c1']).toEqual({ stage: 0, nextDue: 101, lastReviewed: 100 });
  });

  it('کشف دوباره → isNew=false و state دست‌نخورده', () => {
    const first = discoverCard(createInitialAlbum(), 'c1', 100).state;
    const again = discoverCard(first, 'c1', 105);
    expect(again.isNew).toBe(false);
    expect(again.state).toBe(first);
  });

  it('کشف طلایی (روز دُردانه) → golden=true', () => {
    const r = discoverCard(createInitialAlbum(), 'c1', 100, true);
    expect(r.state.discovered['c1']?.golden).toBe(true);
  });

  it('کشف دوباره‌ی طلایی روی کارت عادی → ارتقا به طلایی (بدون تنزل)', () => {
    const normal = discoverCard(createInitialAlbum(), 'c1', 100).state;
    const upgraded = discoverCard(normal, 'c1', 107, true);
    expect(upgraded.isNew).toBe(false);
    expect(upgraded.state.discovered['c1']?.golden).toBe(true);
    // طلایی دوباره عادی نمی‌شود
    const stayGold = discoverCard(upgraded.state, 'c1', 110, false);
    expect(stayGold.state.discovered['c1']?.golden).toBe(true);
  });
});

describe('grantEndowedCards — اثر پیشرفت اعطاشده (Nunes & Drèze 2006)', () => {
  it('اولین بار: ۳ کارت اول هدیه', () => {
    const r = grantEndowedCards(createInitialAlbum(), ['a', 'b', 'c', 'd'], 50);
    expect(r.granted).toEqual(['a', 'b', 'c']);
    expect(r.granted).toHaveLength(ENDOWED_CARDS);
    expect(r.state.endowedGranted).toBe(true);
    expect(Object.keys(r.state.discovered)).toHaveLength(3);
  });

  it('بار دوم: هیچ هدیه‌ای (فقط یک‌بار)', () => {
    const first = grantEndowedCards(createInitialAlbum(), ['a', 'b', 'c'], 50).state;
    const again = grantEndowedCards(first, ['a', 'b', 'c'], 60);
    expect(again.granted).toEqual([]);
    expect(again.state).toBe(first);
  });

  it('کارت‌های ازقبل‌کشف‌شده دوباره هدیه نمی‌شوند', () => {
    const withOne = discoverCard(createInitialAlbum(), 'a', 40).state;
    const r = grantEndowedCards(withOne, ['a', 'b', 'c'], 50);
    expect(r.granted).toEqual(['b', 'c']);
  });

  it('لیست کوتاه‌تر از ۳ هم امن است', () => {
    const r = grantEndowedCards(createInitialAlbum(), ['a'], 50);
    expect(r.granted).toEqual(['a']);
  });
});

describe('مرور فاصله‌دار — فواصل افزایشی ۱/۳/۷/۱۴ (Ebbinghaus; Cepeda)', () => {
  it('REVIEW_INTERVALS دقیقاً [1,3,7,14] است', () => {
    expect([...REVIEW_INTERVALS]).toEqual([1, 3, 7, 14]);
  });

  it('کارت تازه فردا موعد می‌شود؛ امروز نه', () => {
    const a = discoverCard(createInitialAlbum(), 'c1', 100).state;
    expect(dueReviews(a, 100)).toEqual([]);
    expect(dueReviews(a, 101)).toEqual(['c1']);
    // موعد گذشته هم می‌ماند (نه فقط روز دقیق)
    expect(dueReviews(a, 105)).toEqual(['c1']);
  });

  it('markReviewed مراحل را جلو می‌برد: +۳، +۷، +۱۴، سپس هر ۱۴', () => {
    let a = discoverCard(createInitialAlbum(), 'c1', 100).state;
    a = markReviewed(a, 'c1', 101); // stage 1 → موعد ۱۰۴
    expect(a.review['c1']?.nextDue).toBe(104);
    a = markReviewed(a, 'c1', 104); // stage 2 → موعد ۱۱۱
    expect(a.review['c1']?.nextDue).toBe(111);
    a = markReviewed(a, 'c1', 111); // stage 3 → موعد ۱۲۵
    expect(a.review['c1']?.nextDue).toBe(125);
    a = markReviewed(a, 'c1', 125); // سقف stage → +۱۴
    expect(a.review['c1']?.stage).toBe(3);
    expect(a.review['c1']?.nextDue).toBe(139);
  });

  it('markReviewed برای کارت ناموجود → بدون تغییر', () => {
    const a = createInitialAlbum();
    expect(markReviewed(a, 'ghost', 100)).toBe(a);
  });

  it('حداکثر ۳ کارت در «مرور امروز» و قدیمی‌ترین موعدها اول', () => {
    let a = createInitialAlbum();
    a = discoverCard(a, 'c1', 90).state; // موعد ۹۱
    a = discoverCard(a, 'c2', 95).state; // موعد ۹۶
    a = discoverCard(a, 'c3', 98).state; // موعد ۹۹
    a = discoverCard(a, 'c4', 99).state; // موعد ۱۰۰
    const due = dueReviews(a, 100);
    expect(due).toHaveLength(REVIEW_BATCH);
    expect(due).toEqual(['c1', 'c2', 'c3']);
  });
});

describe('albumProgress و sanitizeAlbum', () => {
  it('شمارنده «n از total»', () => {
    let a = createInitialAlbum();
    a = discoverCard(a, 'c1', 1).state;
    a = discoverCard(a, 'c2', 2).state;
    expect(albumProgress(a, 300)).toEqual({ discovered: 2, total: 300 });
  });

  it('sanitizeAlbum: ورودی خراب → اولیه؛ سالم → round-trip', () => {
    expect(sanitizeAlbum(null)).toEqual(createInitialAlbum());
    expect(sanitizeAlbum('x')).toEqual(createInitialAlbum());
    const valid = discoverCard(createInitialAlbum(), 'c1', 100).state;
    expect(sanitizeAlbum(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
    const partial = sanitizeAlbum({ discovered: { c1: { puzzleNumber: 1 } } });
    expect(partial.endowedGranted).toBe(false);
    expect(partial.review).toEqual({});
  });
});
