/**
 * MiniD1 — شبیه‌ساز D1 روی node:sqlite (داخلی Node ≥ 22) برای تست‌ها.
 * بدون وابستگی جدید (سیاست deps). رفتار زیرمجموعه‌ی سازگار با D1 واقعی.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { D1Database, D1PreparedStatement, D1Result } from '../src/d1-types';

// node:sqlite (داخلی Node ≥ 22) هنوز در فهرست builtinهای vite نیست →
// بارگذاری در زمان اجرا با createRequire تا از resolve استاتیک عبور کند.
interface SqliteRunResult {
  lastInsertRowid: number | bigint;
  changes: number | bigint;
}
interface SqliteStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): SqliteRunResult;
}
interface DatabaseSync {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
}
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite') as {
  DatabaseSync: new (path: string) => DatabaseSync;
};

class MiniStatement implements D1PreparedStatement {
  private params: unknown[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.params = values;
    return this;
  }

  private normalizedParams(): Array<string | number | bigint | null> {
    return this.params.map((p) => {
      if (p === undefined || p === null) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p as string | number;
    });
  }

  first<T = unknown>(): Promise<T | null> {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.normalizedParams());
    return Promise.resolve((row as T | undefined) ?? null);
  }

  run<T = unknown>(): Promise<D1Result<T>> {
    const stmt = this.db.prepare(this.sql);
    // RETURNING → باید all باشد
    if (/returning/i.test(this.sql)) {
      const rows = stmt.all(...this.normalizedParams()) as T[];
      return Promise.resolve({ results: rows, success: true, meta: {} });
    }
    const info = stmt.run(...this.normalizedParams());
    return Promise.resolve({
      results: [] as T[],
      success: true,
      meta: { last_row_id: Number(info.lastInsertRowid), changes: Number(info.changes) },
    });
  }

  all<T = unknown>(): Promise<D1Result<T>> {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...this.normalizedParams()) as T[];
    return Promise.resolve({ results: rows, success: true, meta: {} });
  }
}

export class MiniD1 implements D1Database {
  private readonly db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(':memory:');
  }

  prepare(query: string): D1PreparedStatement {
    return new MiniStatement(this.db, query);
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    const out: D1Result[] = [];
    for (const s of statements) out.push(await s.run());
    return out;
  }

  exec(query: string): Promise<{ count: number; duration: number }> {
    this.db.exec(query);
    return Promise.resolve({ count: 1, duration: 0 });
  }
}

/** دیتابیس تست با اسکیمای واقعی migrations/0001_init.sql */
export function createTestDb(): MiniD1 {
  const db = new MiniD1();
  const sqlPath = fileURLToPath(new URL('../migrations/0001_init.sql', import.meta.url));
  const sql = readFileSync(sqlPath, 'utf8');
  void db.exec(sql);
  return db;
}
