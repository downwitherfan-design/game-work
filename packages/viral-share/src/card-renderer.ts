/**
 * رندر کارت تصویری فرهنگی روی canvas بومی مرورگر — «بیلبورد رایگان» استوری.
 *
 * دو فرمت: استوری ۱۰۸۰×۱۹۲۰ و پست ۱۰۸۰×۱۰۸۰.
 * فونت Vazirmatn (پیش‌فرض سیستم اپ — ui-kit آن را لود می‌کند)، قاب طلایی
 * برای کارت‌های occasion/legendary، لوگوی «د»، واترمارک ظریف dordaneh.app.
 *
 * شکستن خط فارسی: کلمه‌محور با measureText — هرگز وسط کلمه نمی‌شکنیم؛
 * ZWNJ داخل کلمه حفظ می‌شود (word split فقط روی فاصله‌ی معمولی).
 *
 * رنگ‌ها از توکن‌های قرارداد ui-kit (docs/02_CONTRACTS.md §4) — canvas به
 * CSS variables دسترسی ندارد، پس مقادیر قراردادی توکن‌ها این‌جا به‌عنوان
 * ثابت‌های همنام token آینه شده‌اند (منبع: قرارداد §4، نه سلیقه).
 */

import type { CultureCard } from '@dordaneh/contracts';
import type { CanvasFactory, CardFormat, CardRenderResult, MinimalCanvas2D } from './types';

/** آینه‌ی توکن‌های رنگ قرارداد ui-kit §4 (کلید = نام CSS variable) */
export const TOKENS = {
  '--dor-bg': '#F7F3E9',
  '--dor-correct': '#4CAF7D',
  '--dor-present': '#E5A83B',
  '--dor-absent': '#B7B0A3',
  '--dor-accent': '#1CA9A6',
  '--dor-gold': '#D4AF37',
  '--dor-dark-bg': '#1B2430',
  '--dor-dark-accent': '#0E6E6B',
} as const;

const FONT_STACK = "'Vazirmatn', sans-serif";

export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1080 },
};

/** آیا کارت قاب طلایی (legendary) می‌گیرد؟ مناسبت‌ها = طلایی */
export function isLegendary(card: CultureCard): boolean {
  return card.kind === 'occasion';
}

/**
 * شکستن خط کلمه‌محور فارسی با measureText.
 * @param maxWidth حداکثر پهنای هر خط به پیکسل
 */
export function wrapPersianText(
  ctx: Pick<MinimalCanvas2D, 'measureText'>,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  // احترام به شکست خط‌های خود متن (ابیات شعر)
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ').filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current === '' ? word : `${current} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth || current === '') {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current !== '') lines.push(current);
  }
  return lines;
}

function roundRect(
  ctx: MinimalCanvas2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface CardStrings {
  watermark: string;
  footer: string;
}

/**
 * رندر کارت فرهنگی. طرح (بالا→پایین):
 * لوگوی «د» در کاشی فیروزه‌ای → عنوان → متن اصلی (شعر/مثل) → توضیح →
 * منبع → فوتر برند + واترمارک.
 */
export function renderCultureCard(
  card: CultureCard,
  format: CardFormat,
  createCanvas: CanvasFactory,
  strings: CardStrings,
): Promise<CardRenderResult> {
  const { width, height } = CARD_SIZES[format];
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas 2d context unavailable'));

  const legendary = isLegendary(card);
  const gold = TOKENS['--dor-gold'];
  const accent = TOKENS['--dor-accent'];

  // ── پس‌زمینه‌ی کاغذی گرم با گرادیان ظریف
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, TOKENS['--dor-bg']);
  bg.addColorStop(1, '#EFE8D8'); // سایه‌ی گرم‌ترِ همان توکن bg برای عمق
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // ── قاب دور کارت (طلایی برای legendary، فیروزه‌ای در حالت عادی)
  const margin = 48;
  ctx.lineWidth = legendary ? 14 : 8;
  ctx.strokeStyle = legendary ? gold : accent;
  roundRect(ctx, margin, margin, width - margin * 2, height - margin * 2, 36);
  ctx.stroke();
  if (legendary) {
    // خط دوم ظریف داخل قاب طلایی — حس «نسخه‌ی نفیس»
    ctx.lineWidth = 3;
    roundRect(ctx, margin + 22, margin + 22, width - (margin + 22) * 2, height - (margin + 22) * 2, 26);
    ctx.stroke();
  }

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = width / 2;

  // ── لوگوی «د» در کاشی فیروزه‌ای
  const logoSize = format === 'story' ? 160 : 120;
  const logoY = format === 'story' ? 220 : 150;
  ctx.fillStyle = legendary ? gold : accent;
  roundRect(ctx, cx - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize, 28);
  ctx.fill();
  ctx.fillStyle = TOKENS['--dor-bg'];
  ctx.font = `bold ${Math.round(logoSize * 0.62)}px ${FONT_STACK}`;
  ctx.fillText('د', cx, logoY + logoSize * 0.04);

  // ── عنوان کارت
  const titleY = logoY + logoSize / 2 + (format === 'story' ? 110 : 80);
  ctx.fillStyle = TOKENS['--dor-dark-bg'];
  ctx.font = `bold ${format === 'story' ? 56 : 48}px ${FONT_STACK}`;
  ctx.fillText(card.title, cx, titleY);

  // خط تزئینی زیر عنوان
  ctx.strokeStyle = legendary ? gold : TOKENS['--dor-present'];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 120, titleY + 46);
  ctx.lineTo(cx + 120, titleY + 46);
  ctx.stroke();

  // ── متن اصلی (شعر/مثل/دانستنی) — شکست خط کلمه‌محور
  const bodyFontSize = format === 'story' ? 64 : 52;
  const bodyLineHeight = Math.round(bodyFontSize * 1.75);
  const maxTextWidth = width - margin * 2 - 120;
  ctx.font = `bold ${bodyFontSize}px ${FONT_STACK}`;
  const bodyLines = wrapPersianText(ctx, card.body, maxTextWidth);
  let y = titleY + (format === 'story' ? 190 : 130);
  ctx.fillStyle = TOKENS['--dor-dark-bg'];
  for (const line of bodyLines) {
    ctx.fillText(line, cx, y);
    y += bodyLineHeight;
  }

  // ── توضیح (اختیاری، فونت کوچک‌تر و کم‌رنگ‌تر)
  if (card.explanation) {
    y += format === 'story' ? 40 : 20;
    const exFont = format === 'story' ? 40 : 34;
    ctx.font = `${exFont}px ${FONT_STACK}`;
    ctx.fillStyle = TOKENS['--dor-dark-accent'];
    for (const line of wrapPersianText(ctx, card.explanation, maxTextWidth)) {
      ctx.fillText(line, cx, y);
      y += Math.round(exFont * 1.7);
    }
  }

  // ── منبع (اعتبار محتوا — خط قرمز #30)
  y += format === 'story' ? 50 : 26;
  ctx.font = `italic ${format === 'story' ? 34 : 30}px ${FONT_STACK}`;
  ctx.fillStyle = TOKENS['--dor-absent'];
  ctx.fillText(`— ${card.source}`, cx, y);

  // ── فوتر برند: نام اپ + شعار (فقط استوری) + واترمارک ظریف
  const footerY = height - (format === 'story' ? 200 : 150);
  if (format === 'story') {
    ctx.font = `bold 44px ${FONT_STACK}`;
    ctx.fillStyle = accent;
    ctx.fillText(strings.footer, cx, footerY);
  }
  ctx.globalAlpha = 0.55;
  ctx.font = `600 ${format === 'story' ? 38 : 34}px ${FONT_STACK}`;
  ctx.fillStyle = TOKENS['--dor-dark-accent'];
  ctx.fillText(strings.watermark, cx, height - (format === 'story' ? 120 : 92));
  ctx.globalAlpha = 1;

  // ── خروجی PNG
  return new Promise<CardRenderResult>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('canvas toBlob failed'));
        return;
      }
      resolve({ blob, width, height, format });
    }, 'image/png');
  });
}

/** CanvasFactory واقعی مرورگر */
export function browserCanvasFactory(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}
