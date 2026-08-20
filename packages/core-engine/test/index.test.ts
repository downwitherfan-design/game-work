/**
 * تست تطابق entry point با قرارداد — همه‌ی صادرات از @dordaneh/core-engine
 * موجود و متد‌های EngineApi کامل هستند.
 */
import { describe, expect, it } from 'vitest';
import * as api from '../src/index';
import type { EngineApi } from '@dordaneh/contracts';
import { createMockWordDb } from './fixtures/mock-word-db';

describe('entry point (src/index.ts)', () => {
  it('همه‌ی صادرات اصلی موجودند', () => {
    expect(typeof api.createEngine).toBe('function');
    expect(typeof api.evaluateGuessAgainst).toBe('function');
    expect(typeof api.isWinningEvaluation).toBe('function');
    expect(typeof api.applyGuess).toBe('function');
    expect(typeof api.canAcceptGuess).toBe('function');
    expect(typeof api.createInitialState).toBe('function');
    expect(typeof api.markHintUsed).toBe('function');
    expect(typeof api.EngineError).toBe('function');
    expect(typeof api.clampDifficulty).toBe('function');
    expect(typeof api.getDifficultyProfile).toBe('function');
    expect(typeof api.suggestNextDifficulty).toBe('function');
    expect(typeof api.isDordanehDay).toBe('function');
    expect(typeof api.computeBestHint).toBe('function');
    expect(typeof api.mulberry32).toBe('function');
    expect(typeof api.hashInt).toBe('function');
    expect(typeof api.combineSeeds).toBe('function');
    expect(api.DAILY_WORD_LENGTH).toBe(6);
    expect(api.MAX_GUESSES).toBe(6);
    expect(api.MIN_DIFFICULTY).toBe(1);
    expect(api.MAX_DIFFICULTY).toBe(5);
    expect(api.ONBOARDING_PUZZLE_ID).toBe('onboarding-1');
  });

  it('خروجی createEngine همه‌ی متدهای EngineApi قرارداد را دارد', () => {
    const engine: EngineApi = api.createEngine({ wordDb: createMockWordDb() });
    const methods: Array<keyof EngineApi> = [
      'getDailyPuzzle',
      'getPracticePuzzle',
      'evaluateGuess',
      'getState',
      'getHint',
      'getOnboardingPuzzle',
    ];
    for (const m of methods) expect(typeof engine[m]).toBe('function');
  });
});
