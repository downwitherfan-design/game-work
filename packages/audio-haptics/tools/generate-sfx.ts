/**
 * @dordaneh/audio-haptics — ابزار تولید/بازتولید فایل‌های صوتی (مالک: AI-13).
 *
 * همه‌ی صداها ۱۰۰٪ سنتز قطعی درون-کد هستند (src/dsp.ts + src/sfx-defs.ts) —
 * هیچ نمونه‌ی خارجی/ضبط‌شده‌ای وجود ندارد؛ لایسنس همه‌چیز: مال خود پروژه.
 *
 * نکته‌ی معماری: runtime اپ فایل صوتی «نمی‌خواند» — بافرها را در لحظه‌ی
 * unlock سنتز می‌کند (latency < 50ms و صفر بایت asset در باندل). خروجی این
 * ابزار برای موارد جانبی است: demo، پیش‌نمایش طراحی، و مرجع QA.
 *
 * اجرا (از ریشه‌ی مونوریپو):
 *   npx vite-node packages/audio-haptics/tools/generate-sfx.ts
 *
 * خروجی: packages/audio-haptics/assets/*.webm (Opus) + *.m4a (AAC فالبک)
 * نیازمند ffmpeg در PATH (فقط برای انکود؛ WAV میانی حذف می‌شود).
 */

import { mkdirSync, writeFileSync, rmSync, statSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAMPLE_RATE } from '../src/dsp';
import { ALL_SFX, renderSfx, renderMusicLoop } from '../src/sfx-defs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');

/** بودجه‌ی کل asset (الزام AAB < 30MB): ۴۰۰KB. */
const BUDGET_BYTES = 400 * 1024;

/** Float32 PCM مونو → WAV 16-bit (برای خوراک ffmpeg). */
function toWav(pcm: Float32Array, sampleRate: number): Buffer {
  const n = pcm.length;
  const data = Buffer.alloc(44 + n * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // mono
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i] ?? 0));
    data.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return data;
}

function encode(wavPath: string, outPath: string, args: string[]): void {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, ...args, outPath]);
}

function main(): void {
  mkdirSync(ASSETS, { recursive: true });

  // نسخه‌های لایه‌دار جینگل استریک عمداً فایل نمی‌شوند — دمو و runtime
  // آن‌ها را زنده سنتز می‌کنند (winJingle(1..3)) → صرفه‌جویی در بودجه.
  const jobs: { name: string; pcm: Float32Array; music?: boolean }[] = [
    ...ALL_SFX.map((name) => ({ name, pcm: renderSfx(name) })),
    { name: 'music_santoor_loop', pcm: renderMusicLoop(), music: true },
  ];

  for (const job of jobs) {
    const wavPath = join(ASSETS, `${job.name}.tmp.wav`);
    writeFileSync(wavPath, toWav(job.pcm, SAMPLE_RATE));
    const bitrate = job.music ? '24k' : '40k';
    // libopus فقط 48k/24k/16k/... — برای موسیقی 24kHz کافی است (لوپ ملایم)
    const opusExtra = job.music ? ['-ar', '24000'] : [];
    const aacExtra = job.music ? ['-ar', '32000'] : [];
    encode(wavPath, join(ASSETS, `${job.name}.webm`), ['-c:a', 'libopus', '-b:a', bitrate, ...opusExtra]);
    encode(wavPath, join(ASSETS, `${job.name}.m4a`), ['-c:a', 'aac', '-b:a', bitrate, ...aacExtra]);
    rmSync(wavPath);
  }

  // گزارش و گارد بودجه
  let total = 0;
  const rows: string[] = [];
  for (const f of readdirSync(ASSETS).sort()) {
    if (!/\.(webm|m4a)$/.test(f)) continue;
    const s = statSync(join(ASSETS, f)).size;
    total += s;
    rows.push(`  ${f.padEnd(28)} ${(s / 1024).toFixed(1)} KB`);
  }
  console.warn(rows.join('\n'));
  console.warn(`— total: ${(total / 1024).toFixed(1)} KB (budget ${BUDGET_BYTES / 1024} KB)`);
  if (total > BUDGET_BYTES) {
    console.error('⛔ ASSET BUDGET EXCEEDED');
    process.exit(1);
  }
}

main();
