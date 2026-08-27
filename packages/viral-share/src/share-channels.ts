/**
 * زنجیره‌ی فالبک اشتراک متن:
 *   navigator.share → کلیپ‌بورد (+Toast «کپی شد! تو تلگرام بفرستش 📤»)
 *   → پنجره‌ی مستقیم t.me/share.
 *
 * همه‌ی وابستگی‌های محیطی تزریق‌پذیرند تا در Node تست‌پذیر باشند
 * (پوشش ≥۸۰٪ بدون jsdom — صفر وابستگی جدید).
 */

import { telegramShareUrl } from './links';

/** نتیجه‌ی زنجیره — برای رویداد share_completed و UX تست‌پذیر */
export type ShareOutcome = 'native' | 'clipboard' | 'telegram' | 'failed';

export interface ShareEnv {
  /** navigator.share — undefined یعنی پشتیبانی نمی‌شود */
  nativeShare?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
  /** آیا navigator.canShare این payload را می‌پذیرد؟ (برای فایل تصویر) */
  canShare?: (data: { files?: File[] }) => boolean;
  /** navigator.clipboard.writeText */
  clipboardWrite?: (text: string) => Promise<void>;
  /** window.open — آخرین فالبک (تلگرام) */
  openUrl?: (url: string) => void;
  /** نمایش Toast (از ui-kit در ShareSheet تزریق می‌شود) */
  toast?: (message: string) => void;
  /** دانلود فایل — فالبک اشتراک تصویر */
  download?: (blob: Blob, fileName: string) => void;
}

/** ساخت env واقعی مرورگر — جدا برای تست‌پذیری */
export function browserShareEnv(): ShareEnv {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const win = typeof window === 'undefined' ? undefined : window;
  return {
    nativeShare: nav?.share ? nav.share.bind(nav) : undefined,
    canShare: nav?.canShare ? nav.canShare.bind(nav) : undefined,
    clipboardWrite: nav?.clipboard?.writeText
      ? nav.clipboard.writeText.bind(nav.clipboard)
      : undefined,
    openUrl: win ? (url: string) => void win.open(url, '_blank', 'noopener') : undefined,
  };
}

/**
 * اشتراک متن با فالبک زنجیره‌ای.
 * @returns مسیر موفق — 'failed' فقط وقتی هر سه راه ناموجود/ناموفق باشند.
 */
export async function shareTextWithFallback(
  text: string,
  title: string,
  env: ShareEnv,
  copiedMessage: string,
): Promise<ShareOutcome> {
  // ۱) Web Share API — بی‌اصطکاک‌ترین مسیر
  if (env.nativeShare) {
    try {
      await env.nativeShare({ title, text });
      return 'native';
    } catch (err) {
      // AbortError = کاربر شیت را بست؛ این «شکست» نیست و فالبک نمی‌خواهد
      if (err instanceof Error && err.name === 'AbortError') return 'failed';
      // سایر خطاها → ادامه‌ی زنجیره
    }
  }

  // ۲) کپی به کلیپ‌بورد + Toast هدایتگر به تلگرام
  if (env.clipboardWrite) {
    try {
      await env.clipboardWrite(text);
      env.toast?.(copiedMessage);
      return 'clipboard';
    } catch {
      // ادامه‌ی زنجیره
    }
  }

  // ۳) پنجره‌ی مستقیم تلگرام — مهم‌ترین کانال ایران
  if (env.openUrl) {
    env.openUrl(telegramShareUrl(text));
    return 'telegram';
  }

  return 'failed';
}

/**
 * اشتراک فایل تصویر (کارت فرهنگی) با فالبک دانلود.
 * @returns 'native' اگر share شد؛ 'download' اگر به دانلود افتاد.
 */
export async function shareImageWithFallback(
  blob: Blob,
  fileName: string,
  title: string,
  env: ShareEnv,
): Promise<'native' | 'download' | 'failed'> {
  if (env.nativeShare && typeof File !== 'undefined') {
    const file = new File([blob], fileName, { type: 'image/png' });
    const payload = { files: [file] };
    const supported = env.canShare ? env.canShare(payload) : true;
    if (supported) {
      try {
        await env.nativeShare({ title, files: [file] });
        return 'native';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return 'failed';
      }
    }
  }
  if (env.download) {
    env.download(blob, fileName);
    return 'download';
  }
  return 'failed';
}

/** دانلود Blob در مرورگر — جدا برای تست‌پذیری */
export function browserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // آزادسازی پس از کلیک (تسک بعدی رویداد)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
