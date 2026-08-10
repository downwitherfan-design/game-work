/**
 * @dordaneh/contracts — REST backend contract types (server: AI-09, clients: everyone).
 * Source of truth: docs/02_CONTRACTS.md §7. Locked (RFC only).
 * Base: https://api.<domain>/v1 — همه‌ی پاسخ‌ها { ok, data?, error? }.
 * کلاینت‌ها باید همه‌ی خطاهای شبکه را silent-degrade کنند (اپ آفلاین-اول است).
 */

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** هویت: UUIDv4 محلی — بدون ثبت‌نام. name اختیاری (پیش‌فرض: «مسافر + عدد») */
export type AnonId = string;

// GET /daily/:puzzleNumber/meta
export interface DailyMetaData {
  /** صحت‌سنجی جواب آفلاین */
  checksum: string;
}

// POST /result
export interface ResultBody {
  anonId: AnonId;
  puzzleNumber: number;
  won: boolean;
  guessCount: number;
  durationMs: number;
}
export interface ResultData {
  percentile: number;
}

// GET /leaderboard/global/:puzzleNumber و GET /circle/:id/board/:puzzleNumber
export interface LeaderboardEntry {
  name: string;
  score: number;
  rank: number;
}
export interface LeaderboardData {
  entries: LeaderboardEntry[];
}

// POST /circle
export interface CircleCreateBody {
  anonId: AnonId;
  name: string;
}
export interface CircleCreateData {
  circleId: string;
  inviteUrl: string;
}

// POST /circle/:id/join
export interface CircleJoinBody {
  anonId: AnonId;
  name: string;
}
export interface CircleJoinData {
  ok: boolean;
}

// POST /duel
export interface DuelCreateBody {
  anonId: AnonId;
  name: string;
}
export interface DuelCreateData {
  duelId: string;
  inviteUrl: string;
  seed: number;
}

// POST /duel/:id/result
export interface DuelResultBody {
  anonId: AnonId;
  guessCount: number;
  durationMs: number;
}

export type DuelStatus = 'waiting' | 'finished';

export interface DuelPlayer {
  name: string;
  guessCount?: number;
  durationMs?: number;
}

export interface DuelResultData {
  status: DuelStatus;
  opponent?: DuelPlayer;
}

// GET /duel/:id
export interface DuelStateData {
  status: DuelStatus;
  players: DuelPlayer[];
}
