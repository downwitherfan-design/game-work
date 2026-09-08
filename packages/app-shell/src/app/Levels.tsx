/**
 * صفحه‌ی «مراحل» — ساختار اپ واقعی که کاربر خواست.
 *
 * دو حالت دارد:
 *  ۱) فهرست: ۴ دفتر × ۱۲ مرحله، با قفل/باز و نشان برد.
 *  ۲) بازیِ یک مرحله: همان GameScreen واقعی با seed و دشواریِ قطعیِ آن مرحله
 *     (پس مرحله‌ی N همیشه همان کلمه است) و بدون انتخابگر دشواری.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentType, JSX } from 'preact';
import { toPersianDigits } from '@dordaneh/contracts';
import { t } from '../core/i18n';
import { useShell } from './context';
import { loadGameScreen } from './screens';
import {
  LEVELS_PER_CHAPTER,
  TOTAL_LEVELS,
  buildLevels,
  currentLevel,
  readProgress,
  recordLevelWin,
  resetProgress,
  type LevelDef,
  type LevelsProgress,
} from '../core/levels';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

const CHAPTER_TITLES = [
  'appShell.levels.chapter1',
  'appShell.levels.chapter2',
  'appShell.levels.chapter3',
  'appShell.levels.chapter4',
];

function LevelButton(props: { level: LevelDef; onPlay: (n: number) => void }): JSX.Element {
  const { level } = props;
  const locked = level.state === 'locked';
  return (
    <button
      type="button"
      id={`level-${String(level.n)}`}
      class="dor-level"
      data-state={level.state}
      disabled={locked}
      aria-label={`${t('appShell.levels.level', { n: toPersianDigits(level.n) })} — ${
        locked
          ? t('appShell.levels.locked')
          : level.state === 'done'
            ? t('appShell.levels.done')
            : t('appShell.levels.current')
      }`}
      onClick={() => !locked && props.onPlay(level.n)}
    >
      <span class="dor-level__n">{toPersianDigits(level.n)}</span>
      <span class="dor-level__mark" aria-hidden="true">
        {level.state === 'done' ? '★' : locked ? '🔒' : '▶'}
      </span>
    </button>
  );
}

/** بازی یک مرحله با GameScreen واقعی */
function LevelPlay(props: {
  level: LevelDef;
  onWin: (n: number) => void;
  onBack: () => void;
}): JSX.Element {
  const { services, bus } = useShell();
  const [Screen, setScreen] = useState<AnyComponent | null>(null);

  useEffect(() => {
    let alive = true;
    void loadGameScreen().then((c) => {
      if (alive) setScreen(() => c);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="level-play" class="dor-screen" dir="rtl">
      <header class="dor-level-play__bar">
        <button type="button" id="level-back" class="dor-level-play__back" onClick={props.onBack}>
          {t('appShell.levels.back')}
        </button>
        <strong class="dor-level-play__title">
          {t('appShell.levels.level', { n: toPersianDigits(props.level.n) })}
        </strong>
      </header>

      {Screen ? (
        <Screen
          // key: تغییر مرحله باید کامپوننت را از صفر بسازد
          key={`level-${String(props.level.n)}`}
          mode="practice"
          engine={services.engine}
          audio={services.audio}
          bus={bus}
          practiceSeed={props.level.seed}
          practiceDifficulty={props.level.difficulty}
          hideDifficultyPicker
          hideNewPractice
          onFinished={(won: boolean) => {
            if (won) props.onWin(props.level.n);
          }}
        />
      ) : (
        <p class="dor-loading">{t('appShell.loading')}</p>
      )}
    </section>
  );
}

export function LevelsScreen(): JSX.Element {
  const { storage } = useShell();
  const [progress, setProgress] = useState<LevelsProgress>(() => readProgress(storage));
  const [playing, setPlaying] = useState<number | null>(null);

  const levels = useMemo(() => buildLevels(progress), [progress]);
  const cur = currentLevel(progress);

  if (playing !== null) {
    const level = levels[playing - 1];
    if (level) {
      return (
        <LevelPlay
          level={level}
          onWin={(n) => setProgress(recordLevelWin(storage, n))}
          onBack={() => setPlaying(null)}
        />
      );
    }
  }

  const allDone = progress.cleared >= TOTAL_LEVELS;

  return (
    <section id="levels-screen" class="dor-screen dor-levels" dir="rtl">
      <header class="dor-levels__hero">
        <h2 class="dor-levels__title">{t('appShell.levels.title')}</h2>
        <p class="dor-levels__subtitle">{t('appShell.levels.subtitle')}</p>
        <p id="levels-progress" class="dor-levels__progress">
          {t('appShell.levels.progress', {
            done: toPersianDigits(progress.cleared),
            total: toPersianDigits(TOTAL_LEVELS),
          })}
        </p>
        <div
          class="dor-levels__bar"
          role="progressbar"
          aria-valuenow={progress.cleared}
          aria-valuemax={TOTAL_LEVELS}
        >
          <span style={`inline-size:${String((progress.cleared / TOTAL_LEVELS) * 100)}%`} />
        </div>
      </header>

      {allDone ? (
        <p id="levels-all-done" class="dor-levels__alldone">
          {t('appShell.levels.allDone')}
        </p>
      ) : null}

      {CHAPTER_TITLES.map((titleKey, i) => {
        const chapter = i + 1;
        const items = levels.filter((l) => l.chapter === chapter);
        const unlockedHere = items.some((l) => l.state !== 'locked');
        return (
          <section
            key={chapter}
            id={`chapter-${String(chapter)}`}
            class="dor-levels__chapter"
            data-unlocked={unlockedHere ? 'true' : 'false'}
          >
            <h3 class="dor-levels__chapter-title">{t(titleKey)}</h3>
            <div class="dor-levels__grid">
              {items.map((l) => (
                <LevelButton key={l.n} level={l} onPlay={(n) => setPlaying(n)} />
              ))}
            </div>
          </section>
        );
      })}

      <button
        type="button"
        id="levels-play-current"
        class="dor-primary dor-levels__cta"
        onClick={() => setPlaying(cur)}
      >
        {t('appShell.levels.level', { n: toPersianDigits(cur) })}
      </button>

      {progress.cleared > 0 ? (
        <button
          type="button"
          id="levels-reset"
          class="dor-levels__reset"
          onClick={() => setProgress(resetProgress(storage))}
        >
          {t('appShell.levels.reset')}
        </button>
      ) : null}
    </section>
  );
}

// برای تست‌ها/ابزارها
export { LEVELS_PER_CHAPTER, TOTAL_LEVELS };
