import { describe, it, expect } from 'vitest';
import {
  validateCards,
  EXPLANATION_MAX,
  SHARE_CAPTION_MAX,
} from '../src/validate';

function goodCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'prv-001',
    kind: 'proverb',
    title: 'ضرب‌المثل روز',
    body: 'کار نیکو کردن از پر کردن است.',
    explanation: 'مهارت با تمرین و تکرار به دست می‌آید.',
    source: 'امثال و حکم، علی‌اکبر دهخدا',
    shareCaption: 'کار نیکو کردن از پر کردن است. — دُردانه',
    ...overrides,
  };
}

describe('validateCards — ساختار کلی', () => {
  it('آرایه‌نبودن ورودی را رد می‌کند', () => {
    const r = validateCards({ not: 'array' });
    expect(r.ok).toBe(false);
    expect(r.total).toBe(0);
  });

  it('عضو غیرشیء را رد می‌کند', () => {
    const r = validateCards([null, 'str', 42, [goodCard()]]);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('کارت سالم را می‌پذیرد و شمارش می‌کند', () => {
    const r = validateCards([goodCard()]);
    expect(r.ok).toBe(true);
    expect(r.counts.proverb).toBe(1);
    expect(r.total).toBe(1);
  });

  it('حد minCount را اعمال می‌کند', () => {
    const r = validateCards([goodCard()], 300);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('300'))).toBe(true);
  });
});

describe('validateCards — id و kind', () => {
  it('id با الگوی نادرست رد می‌شود', () => {
    expect(validateCards([goodCard({ id: 'proverb-1' })]).ok).toBe(false);
    expect(validateCards([goodCard({ id: 'prv-1' })]).ok).toBe(false);
    expect(validateCards([goodCard({ id: '' })]).ok).toBe(false);
    expect(validateCards([goodCard({ id: 42 })]).ok).toBe(false);
  });

  it('id تکراری رد می‌شود', () => {
    const r = validateCards([goodCard(), goodCard({ body: 'متن دیگر برای یکتایی.' })]);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('تکراری'))).toBe(true);
  });

  it('kind ناشناخته رد می‌شود', () => {
    expect(validateCards([goodCard({ kind: 'joke' })]).ok).toBe(false);
  });

  it('ناهم‌خوانی پیشوند id با kind رد می‌شود', () => {
    expect(validateCards([goodCard({ id: 'poe-001' })]).ok).toBe(false);
  });

  it('body تکراری در همان kind رد می‌شود', () => {
    const r = validateCards([goodCard(), goodCard({ id: 'prv-002' })]);
    expect(r.ok).toBe(false);
  });
});

describe('validateCards — فیلدهای اجباری و طول‌ها', () => {
  it('source خالی = رد کار', () => {
    expect(validateCards([goodCard({ source: '' })]).ok).toBe(false);
    expect(validateCards([goodCard({ source: '   ' })]).ok).toBe(false);
  });

  it('فیلد با فاصله‌ی ابتدا/انتها رد می‌شود', () => {
    expect(validateCards([goodCard({ title: ' عنوان ' })]).ok).toBe(false);
  });

  it('shareCaption بیش از حد رد می‌شود', () => {
    const long = 'م'.repeat(SHARE_CAPTION_MAX + 1);
    expect(validateCards([goodCard({ shareCaption: long })]).ok).toBe(false);
  });

  it('explanation بیش از حد رد می‌شود، در سقف پذیرفته می‌شود', () => {
    expect(validateCards([goodCard({ explanation: 'م'.repeat(EXPLANATION_MAX + 1) })]).ok).toBe(false);
    expect(validateCards([goodCard({ explanation: 'م'.repeat(EXPLANATION_MAX) })]).ok).toBe(true);
  });

  it('explanation اختیاری است اما اگر بود نباید خالی باشد', () => {
    const noExp = goodCard();
    delete noExp.explanation;
    expect(validateCards([noExp]).ok).toBe(true);
    expect(validateCards([goodCard({ explanation: '' })]).ok).toBe(false);
  });
});

describe('validateCards — occasionDate', () => {
  function occasionCard(date: string): Record<string, unknown> {
    return goodCard({
      id: 'occ-001',
      kind: 'occasion',
      body: 'شب یلدا، بلندترین شب سال است.',
      occasionDate: date,
    });
  }

  it('مناسبت بدون occasionDate رد می‌شود', () => {
    const c = occasionCard('09-30');
    delete c.occasionDate;
    expect(validateCards([c]).ok).toBe(false);
  });

  it("فرمت‌های نادرست رد می‌شوند", () => {
    for (const bad of ['9-30', '09/30', '13-01', '00-10', '09-32', '09-00', 'آذر-۳۰']) {
      expect(validateCards([occasionCard(bad)]).ok, bad).toBe(false);
    }
  });

  it('روز ۳۱ در نیمه‌ی دوم سال شمسی رد می‌شود', () => {
    expect(validateCards([occasionCard('07-31')]).ok).toBe(false);
    expect(validateCards([occasionCard('06-31')]).ok).toBe(true);
    expect(validateCards([occasionCard('12-30')]).ok).toBe(true);
  });

  it('occasionDate روی kind غیرمناسبت رد می‌شود', () => {
    expect(validateCards([goodCard({ occasionDate: '01-01' })]).ok).toBe(false);
  });
});

describe('validateCards — نگارش فارسی و relatedWord', () => {
  it('ي و ك عربی در متن رد می‌شوند', () => {
    expect(validateCards([goodCard({ body: 'كار نيكو' })]).ok).toBe(false);
  });

  it('اعراب در متن رد می‌شود', () => {
    expect(validateCards([goodCard({ title: 'ضربُ‌المثل' })]).ok).toBe(false);
  });

  it('relatedWord نانرمال رد می‌شود', () => {
    expect(validateCards([goodCard({ relatedWord: 'نيكو' })]).ok).toBe(false);
    expect(validateCards([goodCard({ relatedWord: 'دو کلمه' })]).ok).toBe(false);
    expect(validateCards([goodCard({ relatedWord: 'می‌رود' })]).ok).toBe(false);
  });

  it('relatedWord نرمال پذیرفته می‌شود', () => {
    expect(validateCards([goodCard({ relatedWord: 'دردانه' })]).ok).toBe(true);
  });
});
