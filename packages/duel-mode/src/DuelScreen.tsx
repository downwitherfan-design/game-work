/**
 * @dordaneh/duel-mode — DuelScreen صادراتی (route: /duel/*) — قرارداد §6.
 * فقط render: تمام منطق در store است. رنگ/فونت فقط CSS variables قرارداد §4.
 * RTL-first؛ همه‌ی متن‌ها از locales/fa.json از طریق t() (خط قرمز ۲۲).
 */

import { useLayoutEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import { toPersianDigits } from '@dordaneh/contracts';
import type { PuzzleState, StorageApi, TranslateFn } from '@dordaneh/contracts';
import type { DuelStore } from './store';
import { DUEL_STORAGE_KEYS } from './store';
import { getSeries } from './series';
import { DUEL_DNF, type DuelBoardSlotProps, type DuelViewState } from './types';

export interface DuelScreenProps {
  store: DuelStore;
  t: TranslateFn;
  /** مسیر جاری، مثل '/duel' یا '/duel/abc' — app-shell پاس می‌دهد */
  path: string;
  /**
   * اسلات صفحه‌ی بازی: app-shell این را با GameScreen (مالک: AI-06) پر می‌کند.
   * duel-mode طبق نمودار وابستگی حق import مستقیم از game-board را ندارد.
   */
  renderBoard?: (props: DuelBoardSlotProps) => ComponentChildren;
  /** برای نمایش «سری دوئل» — همان storage تزریق‌شده به store */
  storage?: StorageApi;
  /** کپی/اشتراک لینک — پیش‌فرض: clipboard */
  onShareInvite?: (inviteUrl: string) => void;
}

const S = {
  screen: {
    fontFamily: 'var(--dor-font)',
    background: 'var(--dor-bg)',
    minHeight: '100%',
    padding: 'var(--dor-space-4)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 'var(--dor-space-3)',
    textAlign: 'center' as const,
  },
  card: {
    background: 'color-mix(in srgb, var(--dor-bg) 85%, white)',
    borderRadius: 'var(--dor-radius)',
    padding: 'var(--dor-space-4)',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  primaryBtn: {
    background: 'var(--dor-accent)',
    color: 'var(--dor-bg)',
    border: 'none',
    borderRadius: 'var(--dor-radius)',
    padding: 'var(--dor-space-3) var(--dor-space-4)',
    fontFamily: 'var(--dor-font)',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
  },
  secondaryBtn: {
    background: 'transparent',
    color: 'var(--dor-accent)',
    border: '1px solid var(--dor-accent)',
    borderRadius: 'var(--dor-radius)',
    padding: 'var(--dor-space-2) var(--dor-space-4)',
    fontFamily: 'var(--dor-font)',
    fontSize: '0.95rem',
    cursor: 'pointer',
    width: '100%',
  },
  vsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--dor-space-3)',
    marginBlockStart: 'var(--dor-space-3)',
  },
  statBox: {
    flex: '1',
    borderRadius: 'var(--dor-radius)',
    padding: 'var(--dor-space-3)',
    background: 'color-mix(in srgb, var(--dor-accent) 8%, transparent)',
  },
} as const;

function StatBox(props: { label: string; guesses: string; time: string }): VNode {
  return (
    <div style={S.statBox} class="duel-stat-box">
      <strong>{props.label}</strong>
      <div>{props.guesses}</div>
      <div>{props.time}</div>
    </div>
  );
}

export function DuelScreen(props: DuelScreenProps): VNode {
  const { store, t, path } = props;
  const [state, setState] = useState<DuelViewState>(store.getState());

  // useLayoutEffect: اشتراک و enter باید قبل از اولین تعامل کاربر انجام شود
  // (useEffect معوق است و click زودهنگام می‌تواند از enter جلو بزند)
  useLayoutEffect(() => {
    const unsub = store.subscribe(setState);
    void store.enter(path);
    return () => {
      unsub();
      store.dispose();
    };
  }, [store, path]);

  const seriesRecord = useMemo(() => {
    if (state.phase !== 'finished' || !state.opponent || !props.storage) return null;
    return getSeries(props.storage, DUEL_STORAGE_KEYS.series, state.opponent.name);
  }, [state.phase, state.opponent, props.storage]);

  const shareInvite = (): void => {
    if (!state.inviteUrl) return;
    store.markShareInitiated();
    if (props.onShareInvite) props.onShareInvite(state.inviteUrl);
    else void globalThis.navigator?.clipboard?.writeText(state.inviteUrl);
  };

  const onBoardFinished = (puzzle: PuzzleState): void => {
    void store.submitPuzzleResult(puzzle);
  };

  const fmtGuesses = (n?: number): string =>
    n === undefined || n === DUEL_DNF
      ? t('duelMode.didNotSolve')
      : t('duelMode.guesses', { count: toPersianDigits(n) });
  const fmtTime = (ms?: number): string =>
    ms === undefined
      ? '—'
      : t('duelMode.seconds', { count: toPersianDigits(Math.round(ms / 1000)) });

  let body: ComponentChildren;

  switch (state.phase) {
    case 'disabled':
      body = (
        <section style={S.card} id="duel-disabled" aria-live="polite">
          <h2>{t('duelMode.flagOffTitle')}</h2>
          <p>{t('duelMode.flagOffBody')}</p>
        </section>
      );
      break;

    case 'landing':
      body = (
        <section style={S.card} id="duel-landing">
          <h1>{t('duelMode.title')}</h1>
          <p>{t('duelMode.subtitle')}</p>
          <button style={S.primaryBtn} id="duel-create-btn" onClick={() => void store.createDuel()}>
            {t('duelMode.create')}
          </button>
          <p style={{ marginBlockStart: 'var(--dor-space-3)', fontSize: '0.85rem' }}>
            {t('duelMode.dailyDuelHint')}
          </p>
        </section>
      );
      break;

    case 'creating':
      body = (
        <section style={S.card} id="duel-loading" aria-busy="true">
          <p>{t('duelMode.loading')}</p>
        </section>
      );
      break;

    case 'invited':
      // ضد اسپویل: هیچ آمار/گریدی از A نمایش داده نمی‌شود — فقط دعوت
      body = (
        <section style={S.card} id="duel-invited">
          <h2>{t('duelMode.guestWelcome')}</h2>
          <p>{t('duelMode.guestBody', { name: state.hostName ?? t('duelMode.opponent') })}</p>
          <button style={S.primaryBtn} id="duel-accept-btn" onClick={() => store.acceptInvite()}>
            {t('duelMode.acceptDuel')}
          </button>
        </section>
      );
      break;

    case 'solving':
      body = (
        <section style={{ width: '100%' }} id="duel-board-host">
          {state.inviteUrl ? (
            <div style={S.card}>
              <p>{t('duelMode.inviteReady')}</p>
              <button style={S.secondaryBtn} id="duel-share-invite-btn" onClick={shareInvite}>
                {t('duelMode.sendInvite')}
              </button>
            </div>
          ) : null}
          {props.renderBoard && state.duelId && state.seed !== null ? (
            props.renderBoard({
              mode: 'duel',
              seed: state.seed,
              puzzleId: `duel-${state.duelId}`,
              onFinished: onBoardFinished,
            })
          ) : (
            <div style={S.card}>
              <p>{t('duelMode.boardMissing')}</p>
            </div>
          )}
        </section>
      );
      break;

    case 'waiting':
      body = (
        <section style={S.card} id="duel-waiting" aria-live="polite">
          <h2>{t('duelMode.waitingTitle')}</h2>
          <p>{t('duelMode.waitingBody')}</p>
          {state.inviteUrl ? (
            <button style={S.secondaryBtn} id="duel-share-invite-btn" onClick={shareInvite}>
              {t('duelMode.sendInvite')}
            </button>
          ) : null}
        </section>
      );
      break;

    case 'finished': {
      const headline =
        state.verdict === 'win'
          ? t('duelMode.youWon')
          : state.verdict === 'draw'
            ? t('duelMode.draw')
            : t('duelMode.youLost');
      body = (
        <section style={S.card} id="duel-result">
          <h2>{headline}</h2>
          <div style={S.vsRow} id="duel-comparison">
            <StatBox
              label={t('duelMode.me')}
              guesses={fmtGuesses(state.selfResult?.guessCount)}
              time={fmtTime(state.selfResult?.durationMs)}
            />
            <StatBox
              label={state.opponent?.name ?? t('duelMode.opponent')}
              guesses={fmtGuesses(state.opponent?.guessCount)}
              time={fmtTime(state.opponent?.durationMs)}
            />
          </div>
          {seriesRecord ? (
            <p id="duel-series" style={{ marginBlockStart: 'var(--dor-space-3)' }}>
              {t('duelMode.seriesTitle', { name: seriesRecord.opponentName })} —{' '}
              {t('duelMode.seriesScore', {
                wins: toPersianDigits(seriesRecord.wins),
                losses: toPersianDigits(seriesRecord.losses),
              })}
            </p>
          ) : null}
          <button style={S.primaryBtn} id="duel-rematch-btn" onClick={() => void store.rematch()}>
            {t('duelMode.revenge')}
          </button>
          <p style={{ fontSize: '0.8rem' }}>{t('duelMode.revengeHint')}</p>
        </section>
      );
      break;
    }

    case 'expired':
      body = (
        <section style={S.card} id="duel-expired">
          <h2>{t('duelMode.expiredTitle')}</h2>
          <p>{t('duelMode.expiredBody')}</p>
          <button style={S.primaryBtn} id="duel-create-btn" onClick={() => void store.rematch()}>
            {t('duelMode.newDuel')}
          </button>
        </section>
      );
      break;

    case 'error':
      body = (
        <section style={S.card} id="duel-error" role="alert">
          <h2>{t('duelMode.errorTitle')}</h2>
          <p>{t(state.errorKey ?? 'duelMode.errorBody')}</p>
          <button style={S.primaryBtn} id="duel-retry-btn" onClick={() => void store.retry()}>
            {t('duelMode.retry')}
          </button>
        </section>
      );
      break;
  }

  return (
    <main dir="rtl" style={S.screen} id="duel-screen" data-phase={state.phase}>
      {body}
    </main>
  );
}
