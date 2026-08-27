/**
 * GameScreen — کامپوننت صادراتی قرارداد §6 (روت‌های / و /practice و duel).
 * ارکستراسیون کامل: کنترلر + برد + کیبورد + Toast + مودال + کانفتی +
 * نوار پیشرفت + آمار زنده + حالت تمرکز + کیبورد فیزیکی.
 */

import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { AudioApi, EngineApi, EventBus } from '@dordaneh/contracts';
import { createEventBus, puzzleNumberForNow, toPersianDigits } from '@dordaneh/contracts';
import { createBoardController, type BoardController, type GameMode } from '../logic/controller';
import { mapKeyEvent } from '../logic/physical-keys';
import { computeProgress } from '../logic/progress';
import { prefersReducedMotion } from '../logic/reduced-motion';
import { resolveAudio, resolveEngine } from '../mocks/adapters';
import { t, tFa, toastText } from '../i18n';
import { Board } from './board';
import { Keyboard } from './keyboard';
import { ResultModal, type GuessDistribution } from './result-modal';
import { Confetti } from './confetti';

export interface LiveStatData {
  /** «{percent}٪ حل‌کننده‌ها تا حدس {guess}» — از remote config؛ نبود = مخفی */
  percent: number;
  guess: number;
}

export interface GameScreenProps {
  mode: GameMode;
  /** فقط برای duel: seed از AI-10 (منطق دوئل مال او) */
  duelSeed?: number;
  /** تزریق‌ها — app-shell پاس می‌دهد؛ نبود = mock/پیش‌فرض قراردادی */
  engine?: EngineApi;
  audio?: AudioApi;
  bus?: EventBus;
  distribution?: GuessDistribution;
  liveStat?: LiveStatData | null;
  /** سهمیه‌ی راهنمای رایگان (پیش‌فرض ۱) */
  freeHintQuota?: number;
}

const FOCUS_AFTER_GUESSES = 3; // حالت تمرکز (Sweller 1988)

export function GameScreen(props: GameScreenProps) {
  const { mode } = props;
  const [difficulty, setDifficulty] = useState(2);
  const [practiceSeed, setPracticeSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n: number) => n + 1), []);

  const engine = useMemo(() => props.engine ?? resolveEngine(), [props.engine]);
  const audio = useMemo(() => props.audio ?? resolveAudio(), [props.audio]);
  const bus = useMemo(() => props.bus ?? createEventBus(), [props.bus]);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // انتخاب معما بر اساس mode (قرارداد §1)
  const puzzle = useMemo(() => {
    if (mode === 'daily') return engine.getDailyPuzzle(puzzleNumberForNow());
    if (mode === 'duel') return engine.getPracticePuzzle(3, props.duelSeed ?? 0);
    return engine.getPracticePuzzle(difficulty, practiceSeed);
  }, [engine, mode, props.duelSeed, difficulty, practiceSeed]);

  const controller: BoardController = useMemo(
    () =>
      createBoardController({
        engine,
        audio,
        bus,
        mode,
        puzzleId: puzzle.puzzleId,
        wordLength: puzzle.wordLength,
        reducedMotion: reduced,
        freeHintQuota: props.freeHintQuota ?? 1,
      }),
    [engine, audio, bus, mode, puzzle.puzzleId, puzzle.wordLength, reduced, props.freeHintQuota],
  );

  useEffect(() => controller.subscribe(rerender), [controller, rerender]);

  // تبلیغ جایزه‌ای راهنما: گوش‌دادن به تکمیل (پیاده‌سازی تبلیغ مال AI-11)
  useEffect(
    () =>
      bus.on('reward_ad_completed', (e) => {
        if (e.placement === 'hint') controller.grantExtraHint();
      }),
    [bus, controller],
  );

  // کیبورد فیزیکی دسکتاپ
  useEffect(() => {
    const doc = (globalThis as { document?: Document }).document;
    if (!doc) return;
    const onKey = (e: KeyboardEvent): void => {
      const action = mapKeyEvent(e);
      if (!action) return;
      e.preventDefault();
      if (action.kind === 'letter') controller.typeLetter(action.letter);
      else if (action.kind === 'submit') controller.submit();
      else controller.backspace();
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, [controller]);

  const s = controller.getState();
  const progress = computeProgress(s.guesses, s.wordLength);
  const focusMode = s.phase === 'typing' && s.guesses.length >= FOCUS_AFTER_GUESSES;
  const playing = s.phase === 'typing' || s.phase === 'revealing';

  return (
    <main id="game-screen" class="gb-screen" dir="rtl" data-focus={focusMode ? 'true' : undefined}>
      {/* نوار بالا: راهنما + متن راهنمای دریافتی */}
      <header class="gb-topbar gb-peripheral">
        <button
          type="button"
          class="gb-hint-btn"
          disabled={!playing || s.hintLoading}
          onPointerDown={() => controller.requestHint()}
        >
          {s.hintLoading ? t('gameBoard.hintLoading') : t('gameBoard.hint')}
        </button>
        {s.hint ? (
          <span class="gb-hint-text">
            {tFa('gameBoard.hintLetter', {
              letter: s.hint.letter,
              pos: s.hint.position + 1,
            })}
          </span>
        ) : null}
      </header>

      {/* آمار زنده‌ی بی‌اسپویلر (گواه اجتماعی — Cialdini 1984؛ نبودِ داده = مخفی) */}
      {props.liveStat && playing ? (
        <p class="gb-livestat gb-peripheral">
          {tFa('gameBoard.liveStat', {
            percent: props.liveStat.percent,
            guess: props.liveStat.guess,
          })}
        </p>
      ) : null}

      {/* انتخاب دشواری — فقط practice و قبل از اولین حدس */}
      {mode === 'practice' && s.guesses.length === 0 && s.phase === 'typing' ? (
        <div class="gb-difficulty gb-peripheral" aria-label={tFa('gameBoard.practiceDifficulty')}>
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              type="button"
              class="gb-diff-btn"
              data-active={difficulty === d ? 'true' : undefined}
              onPointerDown={() => setDifficulty(d)}
            >
              {t(`gameBoard.difficulty${d}`)} {toPersianDigits(d)}
            </button>
          ))}
        </div>
      ) : null}

      <Board s={s} />

      {/* نوار حس پیشرفت (شیب هدف — Hull 1932) */}
      <div class="gb-peripheral" style="inline-size:100%;max-inline-size:min(92vw,380px)">
        <div class="gb-progress" role="progressbar" aria-valuenow={progress.found} aria-valuemax={progress.total}>
          <div class="gb-progress-fill" style={`--gb-ratio:${progress.ratio}`} />
        </div>
        {progress.found > 0 ? (
          <p class="gb-progress-label">
            {tFa('gameBoard.progress', { found: progress.found, total: progress.total })}
          </p>
        ) : null}
      </div>

      <Keyboard
        guesses={s.guesses}
        disabled={!playing || s.phase === 'revealing'}
        onLetter={(l) => controller.typeLetter(l)}
        onSubmit={() => controller.submit()}
        onBackspace={() => controller.backspace()}
      />

      {/* practice: معمای جدید پس از پایان */}
      {mode === 'practice' && (s.phase === 'won' || s.phase === 'lost') && !s.resultOpen ? (
        <button
          type="button"
          class="gb-share-btn"
          onPointerDown={() => setPracticeSeed(Math.floor(Math.random() * 1e9))}
        >
          {t('gameBoard.newPractice')}
        </button>
      ) : null}

      {s.toast ? (
        <div class="gb-toast" role="alert">
          {toastText(s.toast.text)}
        </div>
      ) : null}

      {s.phase === 'won' && !reduced ? <Confetti /> : null}

      {s.resultOpen ? (
        <ResultModal
          s={s}
          bus={bus}
          distribution={props.distribution}
          onClose={() => controller.closeResult()}
        />
      ) : null}
    </main>
  );
}
