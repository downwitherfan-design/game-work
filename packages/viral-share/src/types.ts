/**
 * @dordaneh/viral-share — تایپ‌های داخلی پکیج (مالک: AI-07).
 * قرارداد عمومی: ShareApi از @dordaneh/contracts (docs/02_CONTRACTS.md §12).
 */

import type { EventBus, TranslateFn } from '@dordaneh/contracts';

/** قالب فصلی/مناسبتی گرید — تازگی دوره‌ای (Berlyne 1960, novelty). */
export interface GridTheme {
  /** نام قالب برای تست/آنالیتیکس */
  name: string;
  correct: string;
  present: string;
  absent: string;
}

/** خروجی رندر کارت تصویری */
export type CardFormat = 'story' | 'post';

export interface CardRenderResult {
  blob: Blob;
  width: number;
  height: number;
  format: CardFormat;
}

/**
 * حداقل سطحی از Canvas 2D که رندرر لازم دارد — تزریق‌پذیر برای تستِ
 * snapshot در Node (بدون jsdom/happy-dom؛ صفر وابستگی جدید).
 */
export interface MinimalCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): MinimalCanvas2D | null;
  toBlob(cb: (blob: Blob | null) => void, type?: string, quality?: number): void;
}

export interface MinimalGradient {
  addColorStop(offset: number, color: string): void;
}

export interface MinimalCanvas2D {
  fillStyle: string | MinimalGradient;
  strokeStyle: string | MinimalGradient;
  lineWidth: number;
  font: string;
  textAlign: 'left' | 'right' | 'center' | 'start' | 'end';
  textBaseline: 'top' | 'middle' | 'alphabetic' | 'bottom';
  direction: 'ltr' | 'rtl' | 'inherit';
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): MinimalGradient;
}

/** سازنده‌ی canvas — در مرورگر document.createElement، در تست mock. */
export type CanvasFactory = (width: number, height: number) => MinimalCanvas;

/** پیکربندی کارخانه‌ی ShareApi */
export interface ShareOptions {
  /** پایه‌ی لینک‌ها و واترمارک — پیش‌فرض https://dordaneh.app */
  baseUrl?: string;
  /** استریک فعلی برای خط «🔥 استریک: ۱۲» (اختیاری — مالک داده: meta-retention) */
  getStreak?: () => number | null;
  /** EventBus برای share_initiated / share_completed (قیف آنالیتیکس AI-12) */
  eventBus?: EventBus;
  /** ساعت تزریق‌پذیر برای قالب مناسبتی (تست‌پذیری) */
  now?: () => Date;
  /** سازنده‌ی canvas تزریق‌پذیر (تست snapshot در Node) */
  canvasFactory?: CanvasFactory;
  /** مترجم — پیش‌فرض: fa.json داخلی پکیج */
  t?: TranslateFn;
  /** قالب گرید اجباری (برای تست/رویداد ویژه) — پیش‌فرض: خودکار از تقویم */
  gridTheme?: GridTheme;
}
