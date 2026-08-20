/**
 * تست خودکار بودجه‌ی حجم asset (الزام DoD: کل ≤ ۴۰۰KB؛ خط قرمز ۱۰: هیچ
 * فایل باینری > 500KB). اگر assets/ خالی باشد (checkout تازه بدون ffmpeg)
 * تست‌های مربوط به فایل skip می‌شوند — بودجه در tools/generate-sfx.ts هم
 * هنگام تولید گارد می‌شود.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const BUDGET_BYTES = 400 * 1024;
const MAX_SINGLE_FILE = 500 * 1024;

function audioFiles(): string[] {
  if (!existsSync(ASSETS)) return [];
  return readdirSync(ASSETS).filter((f) => /\.(webm|m4a|ogg|mp3|wav)$/i.test(f));
}

describe('بودجه‌ی حجم asset', () => {
  const files = audioFiles();

  it('CREDITS.md وجود دارد (لایسنس هر فایل مستند)', () => {
    expect(existsSync(join(ASSETS, 'CREDITS.md'))).toBe(true);
  });

  it.skipIf(files.length === 0)('کل حجم فایل‌های صوتی ≤ ۴۰۰KB', () => {
    const total = files.reduce((s, f) => s + statSync(join(ASSETS, f)).size, 0);
    expect(total).toBeLessThanOrEqual(BUDGET_BYTES);
  });

  it.skipIf(files.length === 0)('هیچ فایل منفرد > 500KB (خط قرمز ۱۰)', () => {
    for (const f of files) {
      expect(statSync(join(ASSETS, f)).size, f).toBeLessThanOrEqual(MAX_SINGLE_FILE);
    }
  });

  it.skipIf(files.length === 0)('هر ۱۰ SFX + موسیقی، هم webm و هم m4a دارند', () => {
    const names = [
      'tap', 'flip', 'correct', 'present', 'absent',
      'win', 'lose', 'streak', 'card_reveal', 'confetti',
      'music_santoor_loop',
    ];
    for (const n of names) {
      expect(files, `${n}.webm`).toContain(`${n}.webm`);
      expect(files, `${n}.m4a`).toContain(`${n}.m4a`);
    }
  });
});
