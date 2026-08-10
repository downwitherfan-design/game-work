#!/usr/bin/env node
/**
 * تولید placeholder های استور (۸ اسکرین‌شات ۱۰۸۰×۱۹۲۰ + آیکون آداپتیو ۵۱۲×۵۱۲).
 * PNG تک‌رنگ فیروزه‌ای (#1ABC9C) — فایل نهایی از AI-04 با RFC می‌آید.
 * بدون هیچ وابستگی — PNG را دستی می‌سازد (zlib داخلی Node).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function crc32(buf) {
  let c,
    table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function solidPng(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3)]);
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TURQUOISE = [0x1a, 0xbc, 0x9c];

mkdirSync(resolve(outDir, 'screenshots'), { recursive: true });
for (let i = 1; i <= 8; i++) {
  const p = resolve(outDir, 'screenshots', `screenshot-0${i}-placeholder.png`);
  writeFileSync(p, solidPng(1080, 1920, TURQUOISE));
  console.log('✅', p);
}
writeFileSync(resolve(outDir, 'icon-adaptive-placeholder.png'), solidPng(512, 512, TURQUOISE));
console.log('✅ icon-adaptive-placeholder.png (512×512)');
