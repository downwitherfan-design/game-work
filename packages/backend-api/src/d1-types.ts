/**
 * تایپ‌های ساختاری حداقلی D1 — بدون وابستگی به @cloudflare/workers-types
 * (سیاست وابستگی: فقط hono + wrangler). این تایپ‌ها زیرمجموعه‌ی سازگار با
 * D1 واقعی Cloudflare هستند و در تست‌ها با شبیه‌ساز SQLite پیاده می‌شوند.
 */

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: { last_row_id?: number; changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

/** Bindingهای Worker (wrangler.jsonc) */
export interface Env {
  DB: D1Database;
  INVITE_BASE_URL: string;
  ALLOWED_ORIGINS: string;
  /** فقط از secret — برای بارگذاری checksumهای روزانه توسط ابزار ops */
  ADMIN_TOKEN?: string;
}
