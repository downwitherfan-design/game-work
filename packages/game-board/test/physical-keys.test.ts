import { describe, expect, it } from 'vitest';
import { mapKeyEvent } from '../src/logic/physical-keys';

describe('نگاشت کیبورد فیزیکی', () => {
  it('Enter → ثبت و Backspace → پاک‌کردن', () => {
    expect(mapKeyEvent({ key: 'Enter' })).toEqual({ kind: 'submit' });
    expect(mapKeyEvent({ key: 'Backspace' })).toEqual({ kind: 'backspace' });
  });

  it('حرف فارسی مستقیم پذیرفته می‌شود', () => {
    expect(mapKeyEvent({ key: 'د' })).toEqual({ kind: 'letter', letter: 'د' });
    expect(mapKeyEvent({ key: 'آ' })).toEqual({ kind: 'letter', letter: 'آ' });
  });

  it('یای عربی و کاف عربی نرمال می‌شوند (ي→ی، ك→ک)', () => {
    expect(mapKeyEvent({ key: '\u064A' })).toEqual({ kind: 'letter', letter: 'ی' });
    expect(mapKeyEvent({ key: '\u0643' })).toEqual({ kind: 'letter', letter: 'ک' });
  });

  it('فالبک QWERTY → چیدمان فارسی ویندوز', () => {
    expect(mapKeyEvent({ key: 'q' })).toEqual({ kind: 'letter', letter: 'ض' });
    expect(mapKeyEvent({ key: 'h' })).toEqual({ kind: 'letter', letter: 'ا' });
    expect(mapKeyEvent({ key: 'H' })).toEqual({ kind: 'letter', letter: 'آ' });
    expect(mapKeyEvent({ key: 'C' })).toEqual({ kind: 'letter', letter: 'ژ' });
    expect(mapKeyEvent({ key: ';' })).toEqual({ kind: 'letter', letter: 'ک' });
    expect(mapKeyEvent({ key: "'" })).toEqual({ kind: 'letter', letter: 'گ' });
    expect(mapKeyEvent({ key: ',' })).toEqual({ kind: 'letter', letter: 'و' });
  });

  it('میان‌برهای مرورگر بلعیده نمی‌شوند', () => {
    expect(mapKeyEvent({ key: 'r', ctrlKey: true })).toBeNull();
    expect(mapKeyEvent({ key: 'v', metaKey: true })).toBeNull();
    expect(mapKeyEvent({ key: 'd', altKey: true })).toBeNull();
  });

  it('کلیدهای بی‌ربط null می‌دهند', () => {
    expect(mapKeyEvent({ key: 'Escape' })).toBeNull();
    expect(mapKeyEvent({ key: 'ArrowUp' })).toBeNull();
    expect(mapKeyEvent({ key: '5' })).toBeNull();
    expect(mapKeyEvent({ key: ' ' })).toBeNull();
  });
});
