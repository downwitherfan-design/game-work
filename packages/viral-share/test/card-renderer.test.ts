import { describe, expect, it } from 'vitest';
import {
  CARD_SIZES,
  isLegendary,
  renderCultureCard,
  TOKENS,
  wrapPersianText,
} from '../src/card-renderer';
import { createRecordingCanvas, legendaryCard, sampleCard } from './helpers';

const STRINGS = { watermark: 'dordaneh.app', footer: 'هر روز یک معما، یک کشف' };

describe('wrapPersianText — شکست خط کلمه‌محور فارسی', () => {
  const ctx = { measureText: (t: string) => ({ width: t.length * 28 }) };

  it('متن کوتاه → یک خط', () => {
    expect(wrapPersianText(ctx, 'سلام دنیا', 1000)).toEqual(['سلام دنیا']);
  });

  it('هرگز وسط کلمه نمی‌شکند', () => {
    const lines = wrapPersianText(ctx, 'هر که بامش بیش برفش بیشتر', 300);
    const words = lines.join(' ').split(' ');
    expect(words).toEqual(['هر', 'که', 'بامش', 'بیش', 'برفش', 'بیشتر']);
    for (const line of lines) {
      expect(ctx.measureText(line).width).toBeLessThanOrEqual(300);
    }
  });

  it('کلمه‌ی نیم‌فاصله‌دار (ZWNJ) یک واحد می‌ماند', () => {
    const word = 'می\u200Cتوانیم';
    const lines = wrapPersianText(ctx, `ما ${word} بازی کنیم`, 200);
    expect(lines.some((l) => l.includes(word))).toBe(true);
  });

  it('کلمه‌ی بلندتر از خط → در خط خودش می‌ماند (بدون حلقه‌ی بی‌پایان)', () => {
    const lines = wrapPersianText(ctx, 'کلمه‌ی‌خیلی‌خیلی‌بلند کوتاه', 100);
    expect(lines[0]).toBe('کلمه‌ی‌خیلی‌خیلی‌بلند');
  });

  it('شکست خط خود متن (ابیات شعر) حفظ می‌شود', () => {
    const lines = wrapPersianText(ctx, 'مصرع اول\nمصرع دوم', 10_000);
    expect(lines).toEqual(['مصرع اول', 'مصرع دوم']);
  });
});

describe('renderCultureCard — snapshot رندر canvas', () => {
  it('استوری ۱۰۸۰×۱۹۲۰ و پست ۱۰۸۰×۱۰۸۰ (بیلبورد استوری)', async () => {
    for (const format of ['story', 'post'] as const) {
      const canvases: ReturnType<typeof createRecordingCanvas>[] = [];
      const factory = (w: number, h: number) => {
        const c = createRecordingCanvas(w, h);
        canvases.push(c);
        return c;
      };
      const result = await renderCultureCard(sampleCard, format, factory, STRINGS);
      expect(result.width).toBe(CARD_SIZES[format].width);
      expect(result.height).toBe(CARD_SIZES[format].height);
      expect(result.blob.type).toBe('image/png');
      expect(canvases[0]!.width).toBe(CARD_SIZES[format].width);
    }
  });

  it('محتوای کارت رسم می‌شود: لوگو «د»، عنوان، متن، منبع، واترمارک', async () => {
    const canvas = createRecordingCanvas(1080, 1920);
    await renderCultureCard(sampleCard, 'story', () => canvas, STRINGS);
    expect(canvas.texts).toContain('د'); // لوگو
    expect(canvas.texts).toContain(sampleCard.title);
    expect(canvas.texts.join(' ')).toContain('بامش'); // متن اصلی (شاید چندخطی)
    expect(canvas.texts).toContain(`— ${sampleCard.source}`);
    expect(canvas.texts).toContain(STRINGS.watermark);
    expect(canvas.texts).toContain(STRINGS.footer); // فقط استوری
  });

  it('پست: شعار فوتر ندارد ولی واترمارک دارد', async () => {
    const canvas = createRecordingCanvas(1080, 1080);
    await renderCultureCard(sampleCard, 'post', () => canvas, STRINGS);
    expect(canvas.texts).not.toContain(STRINGS.footer);
    expect(canvas.texts).toContain(STRINGS.watermark);
  });

  it('توضیح اختیاری: بدون explanation هم رندر می‌شود', async () => {
    const canvas = createRecordingCanvas(1080, 1080);
    const { explanation: _omit, ...rest } = sampleCard;
    await renderCultureCard({ ...rest }, 'post', () => canvas, STRINGS);
    expect(canvas.texts).toContain(rest.title);
  });

  it('کارت legendary (مناسبت) → قاب طلایی دولایه', async () => {
    const gold = createRecordingCanvas(1080, 1920);
    await renderCultureCard(legendaryCard, 'story', () => gold, STRINGS);
    const normal = createRecordingCanvas(1080, 1920);
    await renderCultureCard(sampleCard, 'story', () => normal, STRINGS);
    const strokes = (c: ReturnType<typeof createRecordingCanvas>) =>
      c.ops.filter((o) => o.op === 'stroke').length;
    // قاب دوم legendary → یک stroke بیشتر
    expect(strokes(gold)).toBe(strokes(normal) + 1);
    expect(isLegendary(legendaryCard)).toBe(true);
    expect(isLegendary(sampleCard)).toBe(false);
  });

  it('snapshot ساختاری: توالی عملیات رسم قطعی و پایدار است', async () => {
    const canvas = createRecordingCanvas(1080, 1080);
    await renderCultureCard(sampleCard, 'post', () => canvas, STRINGS);
    const opSequence = canvas.ops.map((o) => o.op);
    expect(opSequence).toMatchSnapshot();
    const texts = canvas.texts;
    expect(texts).toMatchSnapshot();
  });

  it('context=null → reject با پیام روشن', async () => {
    const broken = { width: 10, height: 10, getContext: () => null, toBlob: () => {} };
    await expect(renderCultureCard(sampleCard, 'post', () => broken, STRINGS)).rejects.toThrow(
      /context/,
    );
  });

  it('toBlob=null → reject', async () => {
    const c = createRecordingCanvas(1080, 1080);
    c.toBlob = (cb) => cb(null);
    await expect(renderCultureCard(sampleCard, 'post', () => c, STRINGS)).rejects.toThrow(
      /toBlob/,
    );
  });

  it('توکن‌های رنگ آینه‌ی قرارداد ui-kit §4 هستند', () => {
    expect(TOKENS['--dor-bg']).toBe('#F7F3E9');
    expect(TOKENS['--dor-gold']).toBe('#D4AF37');
    expect(TOKENS['--dor-accent']).toBe('#1CA9A6');
  });
});
