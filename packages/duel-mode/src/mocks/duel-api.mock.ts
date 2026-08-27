/**
 * @dordaneh/duel-mode — mock سرور دوئل (تا آماده‌شدن backend-api از AI-09).
 * پاسخ‌های نمونه دقیقاً به شکل قرارداد §7؛ درون‌حافظه‌ای و قطعی، بدون شبکه.
 */

import type {
  ApiResponse,
  DuelCreateData,
  DuelPlayer,
  DuelResultData,
  DuelStateData,
} from '@dordaneh/contracts';
import { DUEL_TTL_MS } from '../logic';
import type { DuelApi } from '../types';

interface MockDuelRecord {
  duelId: string;
  seed: number;
  createdAt: number;
  players: Array<DuelPlayer & { anonId: string }>;
}

export interface MockDuelApiOptions {
  /** پایه‌ی لینک دعوت — پیش‌فرض همان دامنه‌ی محصول */
  inviteBase?: string;
  /** ساعت تزریقی برای تست انقضا */
  now?: () => number;
  /** تأخیر مصنوعی شبکه (ms) — صفر در تست‌ها */
  latencyMs?: number;
  /**
   * شبیه‌سازی حریف خودکار: پس از این تعداد poll از /duel/:id،
   * حریف mock بازی‌اش را تمام می‌کند (برای دموی جریان کامل).
   */
  autoOpponentAfterPolls?: number;
}

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}
function err<T>(error: string): ApiResponse<T> {
  return { ok: false, error };
}

let mockCounter = 0;

/** mock درون‌حافظه‌ای با رفتار واقع‌گرایانه (انقضای ۷۲h، حریف خودکار اختیاری) */
export function createMockDuelApi(options: MockDuelApiOptions = {}): DuelApi {
  const inviteBase = options.inviteBase ?? 'https://dordaneh.ir/d/duel';
  const now = options.now ?? Date.now;
  const latencyMs = options.latencyMs ?? 150;
  const duels = new Map<string, MockDuelRecord>();
  const pollCounts = new Map<string, number>();

  const delay = (): Promise<void> =>
    latencyMs > 0 ? new Promise((r) => setTimeout(r, latencyMs)) : Promise.resolve();

  function isExpired(rec: MockDuelRecord): boolean {
    return now() - rec.createdAt >= DUEL_TTL_MS;
  }

  function statusOf(rec: MockDuelRecord): 'waiting' | 'finished' {
    const done = rec.players.filter((p) => p.guessCount !== undefined).length;
    return done >= 2 ? 'finished' : 'waiting';
  }

  return {
    async createDuel(anonId, name): Promise<ApiResponse<DuelCreateData>> {
      await delay();
      mockCounter += 1;
      const duelId = `mock-duel-${mockCounter}`;
      // seed قطعی از duelId تا هر دو طرف همان معما را ببینند
      const seed = 100_000 + mockCounter * 7919;
      duels.set(duelId, {
        duelId,
        seed,
        createdAt: now(),
        players: [{ anonId, name }],
      });
      return ok({ duelId, inviteUrl: `${inviteBase}/${duelId}`, seed });
    },

    async submitResult(duelId, anonId, guessCount, durationMs): Promise<ApiResponse<DuelResultData>> {
      await delay();
      const rec = duels.get(duelId);
      if (!rec) return err('NOT_FOUND');
      if (isExpired(rec)) return err('EXPIRED');

      let player = rec.players.find((p) => p.anonId === anonId);
      if (!player) {
        if (rec.players.length >= 2) return err('DUEL_FULL');
        player = { anonId, name: `مسافر ${rec.players.length + 1}` };
        rec.players.push(player);
      }
      player.guessCount = guessCount;
      player.durationMs = durationMs;

      const opponent = rec.players.find((p) => p.anonId !== anonId);
      const finished = statusOf(rec) === 'finished';
      return ok({
        status: finished ? 'finished' : 'waiting',
        opponent:
          finished && opponent
            ? { name: opponent.name, guessCount: opponent.guessCount, durationMs: opponent.durationMs }
            : undefined,
      });
    },

    async getDuel(duelId): Promise<ApiResponse<DuelStateData>> {
      await delay();
      const rec = duels.get(duelId);
      if (!rec) return err('NOT_FOUND');
      if (isExpired(rec)) return err('EXPIRED');

      // حریف خودکار برای دمو
      const polls = (pollCounts.get(duelId) ?? 0) + 1;
      pollCounts.set(duelId, polls);
      if (
        options.autoOpponentAfterPolls !== undefined &&
        polls >= options.autoOpponentAfterPolls &&
        statusOf(rec) === 'waiting' &&
        rec.players.length >= 1
      ) {
        if (rec.players.length === 1) {
          rec.players.push({ anonId: 'mock-opponent', name: 'حریف آزمایشی' });
        }
        const opp = rec.players[1];
        if (opp && opp.guessCount === undefined) {
          opp.guessCount = 4;
          opp.durationMs = 95_000;
        }
      }

      return ok({
        status: statusOf(rec),
        players: rec.players.map(({ name, guessCount, durationMs }) => ({
          name,
          guessCount,
          durationMs,
        })),
      });
    },
  };
}
