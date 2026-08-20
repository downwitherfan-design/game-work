/**
 * StatsScreen — route /stats (قرارداد §6، مالک AI-08).
 * بازی‌ها، درصد برد، استریک فعلی/بهترین، هیستوگرام توزیع حدس‌ها (highlight امروز)،
 * موزاییک‌های هفتگی، دستاوردها، تقویم ماهانه‌ی شمسی. اعداد فارسی.
 */
import type { VNode } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { puzzleNumberForNow, toPersianDigits, type EventBus } from '@dordaneh/contracts';
import type { MetaRetentionApi } from '../service';
import { t as defaultT } from '../i18n';
import type { TranslateFn } from '@dordaneh/contracts';
import { winRate } from '../stats';
import { mosaicProgress, MAX_FREEZES } from '../streak';
import { ACHIEVEMENTS } from '../achievements';
import { buildMonthCalendar } from '../jalali';
import { Button, ProgressRing, SHARED_CSS } from './kit-adapter';
import { MosaicTile } from './MosaicTile';

export interface StatsScreenProps {
  meta: MetaRetentionApi;
  bus: EventBus;
  t?: TranslateFn;
  /** شماره‌ی معمای امروز — تزریق‌پذیر برای تست؛ پیش‌فرض از قرارداد */
  todayPuzzleNumber?: number;
}

const STATS_CSS = `
${SHARED_CSS}
#stats-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--dor-space-2);text-align:center}
.mr-stat-num{font-size:1.5rem;font-weight:800;color:var(--dor-accent)}
.mr-stat-label{font-size:.72rem;opacity:.75}
.mr-freeze-badge{display:inline-block;margin-inline-start:var(--dor-space-2);font-size:.8rem;opacity:.85}
#guess-histogram{display:flex;flex-direction:column;gap:var(--dor-space-1)}
.mr-hist-row{display:flex;align-items:center;gap:var(--dor-space-2)}
.mr-hist-num{width:1.2em;text-align:center;font-weight:700;font-size:.85rem}
.mr-hist-bar{background:var(--dor-absent);color:var(--dor-bg);border-radius:calc(var(--dor-radius)/2);padding:2px var(--dor-space-2);min-width:1.6em;text-align:start;font-size:.8rem;transition:width .4s ease}
.mr-hist-bar--today{background:var(--dor-correct)}
#mosaic-gallery{display:flex;gap:var(--dor-space-2);flex-wrap:wrap;align-items:center}
#achievements-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--dor-space-2)}
.mr-ach{text-align:center;padding:var(--dor-space-2);border-radius:var(--dor-radius);background:var(--dor-bg);box-shadow:0 1px 3px rgba(0,0,0,.07)}
[data-theme="dark"] .mr-ach{background:var(--dor-dark-bg)}
.mr-ach--locked{opacity:.35;filter:grayscale(1)}
.mr-ach-icon{font-size:1.4rem}
.mr-ach-name{font-size:.62rem;margin-top:2px}
#play-calendar{width:100%}
.mr-cal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--dor-space-2)}
.mr-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:var(--dor-space-1);text-align:center}
.mr-cal-wd{font-size:.68rem;opacity:.6}
.mr-cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:.78rem}
.mr-cal-day--played{background:var(--dor-correct);color:var(--dor-bg);font-weight:700}
.mr-cal-day--today{outline:2px solid var(--dor-accent);outline-offset:1px}
`;

export function StatsScreen(props: StatsScreenProps): VNode {
  const t = props.t ?? defaultT;
  const stats = props.meta.getStats();
  const streak = props.meta.getStreak();
  const effective = props.meta.getEffectiveStreak();
  const today = props.todayPuzzleNumber;

  const [monthOffset, setMonthOffset] = useState(0);
  const calendar = useMemo(() => {
    const anchor = today ?? puzzleNumberForNow();
    return buildMonthCalendar(anchor, stats.playedPuzzles, monthOffset);
  }, [stats.playedPuzzles, monthOffset, today]);

  const maxDist = Math.max(1, ...stats.guessDist);
  const todayWonGuess =
    stats.lastResult && stats.lastResult.won && (today === undefined || stats.lastResult.puzzleNumber === today)
      ? stats.lastResult.guessCount
      : null;

  const mosaic = mosaicProgress(effective);
  const earnedCount = Object.keys(stats.achievements).length;
  const weekdays = t('metaRetention.weekdays').split(',');

  return (
    <main class="mr-screen" id="stats-screen">
      <style>{STATS_CSS}</style>
      <h1>{t('metaRetention.stats.title')}</h1>

      <section class="mr-card" id="stats-summary" aria-label={t('metaRetention.stats.title')}>
        <div>
          <div class="mr-stat-num">{toPersianDigits(stats.gamesPlayed)}</div>
          <div class="mr-stat-label">{t('metaRetention.stats.played')}</div>
        </div>
        <div>
          <div class="mr-stat-num">{toPersianDigits(winRate(stats))}٪</div>
          <div class="mr-stat-label">{t('metaRetention.stats.winRate')}</div>
        </div>
        <div>
          <div class="mr-stat-num">{toPersianDigits(effective)}</div>
          <div class="mr-stat-label">{t('metaRetention.stats.currentStreak')}</div>
        </div>
        <div>
          <div class="mr-stat-num">{toPersianDigits(streak.best)}</div>
          <div class="mr-stat-label">{t('metaRetention.stats.bestStreak')}</div>
        </div>
      </section>

      <p class="mr-freeze-badge" id="freeze-count">
        ❄️{' '}
        {t('metaRetention.stats.freezes', {
          count: `${toPersianDigits(streak.freezes)}/${toPersianDigits(MAX_FREEZES)}`,
        })}
      </p>

      <section aria-labelledby="hist-title">
        <h2 id="hist-title">{t('metaRetention.stats.distribution')}</h2>
        {stats.gamesPlayed === 0 ? (
          <p class="mr-card">{t('metaRetention.stats.empty')}</p>
        ) : (
          <div id="guess-histogram" class="mr-card">
            {stats.guessDist.map((count, i) => (
              <div class="mr-hist-row" key={i}>
                <span class="mr-hist-num">{toPersianDigits(i + 1)}</span>
                <span
                  class={`mr-hist-bar${todayWonGuess === i + 1 ? ' mr-hist-bar--today' : ''}`}
                  style={`width:${Math.round((count / maxDist) * 100)}%`}
                >
                  {toPersianDigits(count)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="mosaic-title">
        <h2 id="mosaic-title">{t('metaRetention.stats.mosaics')}</h2>
        <div class="mr-card" id="mosaic-gallery">
          {Array.from({ length: streak.mosaicsCompleted }, (_, i) => (
            <MosaicTile key={i} index={i} pieces={7} size={56} />
          ))}
          <MosaicTile index={streak.mosaicsCompleted} pieces={mosaic.pieces} size={56} inProgress />
          <span class="mr-stat-label">
            {t('metaRetention.stats.mosaicProgress', {
              pieces: toPersianDigits(mosaic.pieces),
              total: toPersianDigits(mosaic.total),
            })}
          </span>
        </div>
      </section>

      <section aria-labelledby="ach-title">
        <h2 id="ach-title">
          {t('metaRetention.stats.achievements')}{' '}
          <small>
            {t('metaRetention.stats.achievementsCount', {
              earned: toPersianDigits(earnedCount),
              total: toPersianDigits(ACHIEVEMENTS.length),
            })}
          </small>
        </h2>
        <div id="achievements-grid">
          {ACHIEVEMENTS.map((a) => {
            const earned = stats.achievements[a.id] !== undefined;
            return (
              <div class={`mr-ach${earned ? '' : ' mr-ach--locked'}`} key={a.id} title={t(`metaRetention.ach.${a.id}.desc`)}>
                <div class="mr-ach-icon">{a.icon}</div>
                <div class="mr-ach-name">{t(`metaRetention.ach.${a.id}.name`)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="cal-title">
        <h2 id="cal-title">{t('metaRetention.stats.calendar')}</h2>
        <div class="mr-card" id="play-calendar">
          <div class="mr-cal-head">
            <Button variant="ghost" ariaLabel="ماه بعد" onClick={() => setMonthOffset((m: number) => m + 1)}>
              ‹
            </Button>
            <strong>
              {calendar.monthName} {toPersianDigits(calendar.jy)}
            </strong>
            <Button variant="ghost" ariaLabel="ماه قبل" onClick={() => setMonthOffset((m: number) => m - 1)}>
              ›
            </Button>
          </div>
          <div class="mr-cal-grid">
            {weekdays.map((w) => (
              <span class="mr-cal-wd" key={w}>
                {w}
              </span>
            ))}
            {Array.from({ length: calendar.startWeekday }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {calendar.cells.map((c) => (
              <span
                key={c.puzzleNumber}
                class={`mr-cal-day${c.played ? ' mr-cal-day--played' : ''}${c.isToday ? ' mr-cal-day--today' : ''}`}
              >
                {toPersianDigits(c.jd)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section style="margin-top:var(--dor-space-4);text-align:center">
        <Button
          id="share-streak-btn"
          variant="gold"
          onClick={() => props.bus.emit({ type: 'share_initiated', surface: 'streak' })}
        >
          🔥 {t('metaRetention.stats.shareStreak')}
        </Button>
      </section>
    </main>
  );
}

