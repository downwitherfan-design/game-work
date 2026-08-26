/**
 * محاسبه‌ی نسبت کنتراست WCAG 2.1 (فرمول luminance نسبی — W3C).
 * برای چک خودکار AA در تست‌ها (بدون مرورگر).
 */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** نسبت کنتراست ۱..۲۱ */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** AA متن معمولی = 4.5:1؛ AA متن درشت/بولد ≥18.66px = 3:1 */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

/** استخراج مقدار متغیرهای CSS از متن فایل tokens.css برای یک سلکتور مشخص */
export function parseCssVars(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, ''); // حذف کامنت‌ها
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc}\\s*\\{([^}]*)\\}`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const body = m[1] ?? '';
    for (const line of body.split(';')) {
      const kv = /^\s*(--[\w-]+)\s*:\s*(.+)\s*$/.exec(line);
      if (kv && kv[1] && kv[2]) out[kv[1]] = kv[2].trim();
    }
  }
  return out;
}

/** حل ارجاع var(--x) درون نگاشت توکن‌ها */
export function resolveVar(vars: Record<string, string>, name: string, depth = 0): string {
  if (depth > 10) throw new Error(`var resolution loop: ${name}`);
  const v = vars[name];
  if (v === undefined) throw new Error(`missing var: ${name}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref && ref[1]) return resolveVar(vars, ref[1], depth + 1);
  return v;
}
