/**
 * صفحه‌ی خانه (منوی اصلی) — نقطه‌ی ورود اپ.
 *
 * چرا اضافه شد: نسخه‌ی قبلی مستقیماً کاربر را داخل تخته‌ی بازی می‌انداخت،
 * بدون منو، بدون حس «اپ واقعی» و بدون مسیر روشن به بخش‌های دیگر. این صفحه
 * کارت‌های ورود به هر بخش + خلاصه‌ی وضعیت بازیکن را نشان می‌دهد.
 */
import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import { STORAGE_KEYS, puzzleNumberForNow, toPersianDigits } from '@dordaneh/contracts';
import { t } from '../core/i18n';
import { useShell } from './context';
import { TOTAL_LEVELS, readProgress } from '../core/levels';

interface TileDef {
  id: string;
  href: string;
  icon: string;
  title: string;
  desc: string;
  primary?: boolean;
  badge?: string;
}

function MenuTile(props: TileDef): JSX.Element {
  return (
    <a
      id={props.id}
      href={props.href}
      class={`dor-home-tile${props.primary ? ' dor-home-tile--primary' : ''}`}
    >
      <span class="dor-home-tile__icon" aria-hidden="true">
        {props.icon}
      </span>
      <span class="dor-home-tile__text">
        <strong class="dor-home-tile__title">{props.title}</strong>
        <small class="dor-home-tile__desc">{props.desc}</small>
      </span>
      {props.badge ? <span class="dor-home-tile__badge">{props.badge}</span> : null}
    </a>
  );
}

export function Home(): JSX.Element {
  const { services, orchestrator, storage } = useShell();

  /**
   * خلاصه‌ی وضعیت بازیکن — مستقیم از Storage مشترک (کلیدهای قرارداد §5).
   * عمداً از Storage خوانده می‌شود نه از یک متد فرضی روی ارکستراتور: مالک
   * منطق استریک/آمار ماژول meta-retention است و پوسته فقط «می‌خواند».
   */
  const summary = useMemo(() => {
    const streak = storage.get<{ current?: number }>(STORAGE_KEYS.streak);
    const stats = storage.get<{ gamesPlayed?: number }>(STORAGE_KEYS.stats);
    /*
     * ⚠️ آلبوم شکل `AlbumState { discovered: Record<id, …> }` دارد (مالک:
     * meta-retention). قبلاً این‌جا `string[]` فرض می‌شد و شمارنده‌ی
     * «کارت‌ها» همیشه صفر می‌ماند. هر دو شکل پشتیبانی می‌شود تا نصب‌های
     * قدیمی هم درست شمرده شوند.
     */
    const album = storage.get<unknown>(STORAGE_KEYS.album);
    const cardCount = Array.isArray(album)
      ? album.length
      : album !== null && typeof album === 'object'
        ? Object.keys((album as { discovered?: Record<string, unknown> }).discovered ?? {}).length
        : 0;
    const levels = readProgress(storage);
    return {
      streak: typeof streak?.current === 'number' ? streak.current : 0,
      played: typeof stats?.gamesPlayed === 'number' ? stats.gamesPlayed : 0,
      cards: cardCount,
      levelsCleared: levels.cleared,
    };
  }, [storage]);

  /** معمای امروز حل شده؟ از خودِ موتور واقعی می‌پرسیم (منبع حقیقت) */
  const dailySolved = useMemo(() => {
    try {
      const p = services.engine.getDailyPuzzle(puzzleNumberForNow());
      return services.engine.getState(p.puzzleId).status === 'won';
    } catch {
      // معمای امروز هنوز شروع نشده → موتور UNKNOWN_PUZZLE می‌دهد
      return false;
    }
  }, [services]);

  const albumBadge = useMemo(() => orchestrator.hasAlbumBadge(), [orchestrator]);

  return (
    <section id="home-screen" class="dor-screen dor-home" dir="rtl">
      <header class="dor-home__hero">
        <h2 class="dor-home__title">{t('appShell.home.title')}</h2>
        <p class="dor-home__subtitle">{t('appShell.home.subtitle')}</p>
      </header>

      <dl id="home-stats" class="dor-home__stats">
        <div class="dor-home__stat">
          <dt>{t('appShell.home.stat.streak')}</dt>
          <dd>{toPersianDigits(summary.streak)}</dd>
        </div>
        <div class="dor-home__stat">
          <dt>{t('appShell.home.stat.played')}</dt>
          <dd>{toPersianDigits(summary.played)}</dd>
        </div>
        <div class="dor-home__stat">
          <dt>{t('appShell.home.stat.cards')}</dt>
          <dd>{toPersianDigits(summary.cards)}</dd>
        </div>
      </dl>

      <nav class="dor-home__menu" aria-label={t('appShell.home.menuLabel')}>
        <MenuTile
          id="home-daily"
          href="/daily"
          icon="🌟"
          primary
          title={t('appShell.home.daily.title')}
          desc={
            dailySolved ? t('appShell.home.daily.done') : t('appShell.home.daily.desc')
          }
          badge={dailySolved ? '✓' : undefined}
        />
        <MenuTile
          id="home-levels"
          href="/levels"
          icon="🪜"
          title={t('appShell.home.levels.title')}
          desc={
            summary.levelsCleared > 0
              ? t('appShell.levels.progress', {
                  done: toPersianDigits(summary.levelsCleared),
                  total: toPersianDigits(TOTAL_LEVELS),
                })
              : t('appShell.home.levels.desc')
          }
        />
        <MenuTile
          id="home-practice"
          href="/practice"
          icon="🎯"
          title={t('appShell.home.practice.title')}
          desc={t('appShell.home.practice.desc')}
        />
        <MenuTile
          id="home-album"
          href="/album"
          icon="📜"
          title={t('appShell.home.album.title')}
          desc={t('appShell.home.album.desc')}
          badge={albumBadge ? '۱' : undefined}
        />
        <MenuTile
          id="home-stats"
          href="/stats"
          icon="📊"
          title={t('appShell.home.stats.title')}
          desc={t('appShell.home.stats.desc')}
        />
        <MenuTile
          id="home-settings"
          href="/settings"
          icon="⚙️"
          title={t('appShell.home.settings.title')}
          desc={t('appShell.home.settings.desc')}
        />
      </nav>
    </section>
  );
}
