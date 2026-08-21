/**
 * Mock صفحه‌های قراردادی (§6) — تا آماده‌شدن مالکان واقعی:
 * GameScreen (AI-06)، StatsScreen/AlbumScreen (AI-08)، DuelScreen (AI-10)،
 * ShopScreen (AI-11). فقط برای بازنماندن مونتاژ؛ منطق فیچر مال مالک است.
 * همه‌ی متن‌ها از locales/fa.json (t)؛ رنگ‌ها فقط CSS variables قرارداد.
 */
import { useMemo, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import { toPersianDigits, type GuessEvaluation } from '@dordaneh/contracts';
import { t } from '../core/i18n';
import { useShell } from '../app/context';

function MockNote(): JSX.Element {
  return <p class="dor-mock-note">{t('appShell.mock.notReady')}</p>;
}

function Screen(props: { title: string; children?: ComponentChildren }): JSX.Element {
  return (
    <section class="dor-screen">
      <h2>{props.title}</h2>
      <MockNote />
      {props.children}
    </section>
  );
}

function GuessRow({ g }: { g: GuessEvaluation }): JSX.Element {
  return (
    <div class="dor-row" dir="rtl">
      {g.guess.split('').map((ch, i) => (
        <span key={i} class="dor-tile" data-state={g.states[i] ?? 'empty'}>
          {ch}
        </span>
      ))}
    </div>
  );
}

export interface MockGameScreenProps {
  mode?: 'daily' | 'practice';
  puzzleIdOverride?: string;
  onFinished?: (won: boolean) => void;
}

/** GameScreen قراردادی حداقلی — قابل بازی برای تست جریان end-to-end پوسته */
export function MockGameScreen(props: MockGameScreenProps): JSX.Element {
  const { services, bus } = useShell();
  const mode = props.mode ?? 'daily';

  const puzzleId = useMemo(() => {
    if (props.puzzleIdOverride) return props.puzzleIdOverride;
    if (mode === 'practice') return services.engine.getPracticePuzzle(1, 1).puzzleId;
    // شماره‌ی معما از قرارداد؛ قبل از epoch منفی می‌شود — mock فقط قدرمطلق می‌گیرد
    return services.engine.getDailyPuzzle(1).puzzleId;
  }, [mode, props.puzzleIdOverride, services.engine]);

  const [input, setInput] = useState('');
  const [state, setState] = useState(() => services.engine.getState(puzzleId));
  const [started, setStarted] = useState(false);

  function ensureStarted(): void {
    if (!started) {
      bus.emit({ type: 'puzzle_started', puzzleId, mode });
      setStarted(true);
    }
  }

  function submit(e: Event): void {
    e.preventDefault();
    ensureStarted();
    const res = services.engine.evaluateGuess(puzzleId, input);
    if ('error' in res) return;
    setInput('');
    const next = services.engine.getState(puzzleId);
    setState(next);
    bus.emit({ type: 'guess_submitted', puzzleId, guessIndex: next.guesses.length - 1 });
    if (next.status !== 'playing') {
      bus.emit({
        type: 'puzzle_finished',
        puzzleId,
        won: next.status === 'won',
        guessCount: next.guesses.length,
        durationMs: (next.finishedAt ?? next.startedAt) - next.startedAt,
      });
      props.onFinished?.(next.status === 'won');
    }
  }

  return (
    <Screen title={t('appShell.mock.gameTitle')}>
      <div class="dor-board">
        {state.guesses.map((g, i) => (
          <GuessRow key={i} g={g} />
        ))}
      </div>
      {state.status === 'playing' ? (
        <form class="dor-guess-form" onSubmit={submit}>
          <input
            id="mock-guess-input"
            dir="rtl"
            value={input}
            maxLength={state.wordLength + 4}
            placeholder={t('appShell.mock.guessPlaceholder')}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onFocus={ensureStarted}
          />
          <button type="submit">{t('appShell.mock.submit')}</button>
        </form>
      ) : null}
    </Screen>
  );
}

export function MockStatsScreen(): JSX.Element {
  return <Screen title={t('appShell.mock.statsTitle')} />;
}

export function MockAlbumScreen(): JSX.Element {
  const { services } = useShell();
  const album = services.culture.getAlbum();
  return (
    <Screen title={t('appShell.mock.albumTitle')}>
      <p id="album-progress">
        {toPersianDigits(album.cards.length)} / {toPersianDigits(album.total)}
      </p>
      <ul class="dor-album-list">
        {album.cards.map((c) => (
          <li key={c.id} class="dor-card">
            <strong>{c.title}</strong>
            <span>{c.body}</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

export function MockDuelScreen(): JSX.Element {
  return <Screen title={t('appShell.mock.duelTitle')} />;
}

export function MockShopScreen(): JSX.Element {
  return <Screen title={t('appShell.mock.shopTitle')} />;
}
