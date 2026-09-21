/**
 * App اصلی — روتینگ طبق جدول §6 قرارداد با lazy-loading هر route،
 * ناوبری پایین، بج زایگارنیک آلبوم، بازیابی جلسه و آنبوردینگ اولین اجرا.
 */
import { LocationProvider, Router, Route, useLocation, lazy, ErrorBoundary } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import { t } from '../core/i18n';
import { useShell } from './context';
import { Onboarding } from './Onboarding';
import { SettingsScreen } from './Settings';
import { Home } from './Home';
import { LevelsScreen } from './Levels';
import {
  loadAlbumScreen,
  loadDuelScreen,
  loadGameScreen,
  loadShopScreen,
  loadStatsScreen,
  preloadSecondaryScreens,
} from './screens';

// Lazy routes — §6 (کاهش بوت سرد < ۲s)
const DailyScreen = lazy(loadGameScreen);
const PracticeScreen = lazy(loadGameScreen);
const StatsScreen = lazy(loadStatsScreen);
const AlbumScreen = lazy(loadAlbumScreen);
const DuelScreen = lazy(loadDuelScreen);
const ShopScreen = lazy(loadShopScreen);

/**
 * تزریق سرویس‌های واقعی به GameScreen.
 *
 * ⚠️ باگ بحرانی که اینجا رفع شد: قبلاً `<Route component={DailyScreen} />`
 * هیچ prop نمی‌گرفت، پس GameScreen داخل خودش `resolveEngine()` را **بدون
 * wordDb** صدا می‌زد و طبق آداپتور به `createMockEngine()` می‌افتاد. نتیجه:
 * کاربر «موتور mock با کلمات جعلی» می‌دید، در حالی که موتور و واژه‌نامه‌ی
 * واقعی سالم بودند و فقط تزریق نمی‌شدند.
 */
function GameRoute(props: { mode: 'daily' | 'practice' | 'duel'; duelSeed?: number }): JSX.Element {
  const { services, bus } = useShell();
  const Screen = props.mode === 'practice' ? PracticeScreen : DailyScreen;
  return (
    <Screen
      mode={props.mode}
      duelSeed={props.duelSeed}
      engine={services.engine}
      audio={services.audio}
      bus={bus}
    />
  );
}

/**
 * تزریق سرویس‌های واقعی به صفحه‌های AI-08 (آمار و گنجینه).
 *
 * ⚠️ همان باگ GameRoute این‌جا هم بود: `<Route component={StatsScreen} />`
 * هیچ prop نمی‌گرفت، پس `props.meta.getStats()` روی `undefined` صدا زده
 * می‌شد و صفحه با TypeError سفید می‌شد. گِیت «اپ واقعی» این را گرفت.
 */
function StatsRoute(): JSX.Element {
  const { services, bus } = useShell();
  /*
   * ⚠️ prop `t` را پاس نمی‌دهیم: مترجم پوسته کلیدهای metaRetention.* را
   * ندارد و صفحه کلیدهای خام («metaRetention.stats.title») نشان می‌داد.
   * هر پکیج locale خودش را دارد و پیش‌فرضِ خودش درست است.
   */
  return <StatsScreen meta={services.meta} bus={bus} />;
}

function AlbumRoute(): JSX.Element {
  const { services, bus, orchestrator } = useShell();
  // ورود به گنجینه، نشان «تازه» را پاک می‌کند
  useEffect(() => {
    orchestrator.clearAlbumBadge();
  }, [orchestrator]);
  return <AlbumScreen meta={services.meta} culture={services.culture} bus={bus} />;
}

function NavLink(props: {
  href: string;
  id: string;
  label: string;
  active: boolean;
  badge?: boolean;
}): JSX.Element {
  return (
    <a
      href={props.href}
      id={props.id}
      class={props.active ? 'active' : ''}
      aria-current={props.active ? 'page' : undefined}
    >
      {props.label}
      {props.badge ? (
        <span class="dor-badge" aria-label={t('appShell.badge.newCard')}>
          ۱
        </span>
      ) : null}
    </a>
  );
}

function BottomNav(): JSX.Element {
  const { orchestrator } = useShell();
  const { path } = useLocation();
  const [albumBadge, setAlbumBadge] = useState(orchestrator.hasAlbumBadge());

  useEffect(() => {
    // با هر ناوبری، وضعیت بج را تازه کن؛ ورود به آلبوم = پاک‌شدن بج
    if (path.startsWith('/album')) {
      orchestrator.clearAlbumBadge();
      setAlbumBadge(false);
    } else {
      setAlbumBadge(orchestrator.hasAlbumBadge());
    }
  }, [path]);

  return (
    <nav id="bottom-nav" class="dor-bottom-nav" dir="rtl">
      <NavLink href="/" id="nav-home" label={t('appShell.nav.home')} active={path === '/'} />
      <NavLink
        href="/daily"
        id="nav-daily"
        label={t('appShell.nav.daily')}
        active={path.startsWith('/daily')}
      />
      <NavLink
        href="/levels"
        id="nav-levels"
        label={t('appShell.nav.levels')}
        active={path.startsWith('/levels')}
      />
      <NavLink
        href="/stats"
        id="nav-stats"
        label={t('appShell.nav.stats')}
        active={path.startsWith('/stats')}
      />
      <NavLink
        href="/album"
        id="nav-album"
        label={t('appShell.nav.album')}
        active={path.startsWith('/album')}
        badge={albumBadge && !path.startsWith('/album')}
      />
      <NavLink
        href="/settings"
        id="nav-settings"
        label={t('appShell.nav.settings')}
        active={path.startsWith('/settings')}
      />
    </nav>
  );
}

function NotFound(): JSX.Element {
  return (
    <section class="dor-screen" id="not-found">
      <h2>{t('appShell.notFound.title')}</h2>
      <a href="/" class="dor-primary">
        {t('appShell.notFound.back')}
      </a>
    </section>
  );
}

function ResumeBanner(): JSX.Element | null {
  const { orchestrator } = useShell();
  const { path } = useLocation();
  const [session] = useState(() => orchestrator.getResumableSession());
  if (!session || path === session.route) return null;
  return (
    <aside id="resume-banner" class="dor-resume" dir="rtl">
      <span>{t('appShell.resume.title')}</span>
      <a href={session.route}>{t('appShell.resume.continue')}</a>
    </aside>
  );
}

function ScreenTracker(): null {
  const { bus } = useShell();
  const { path } = useLocation();
  useEffect(() => {
    bus.emit({ type: 'screen_viewed', screen: path });
  }, [path]);
  return null;
}

function Shell(props: { children?: ComponentChildren }): JSX.Element {
  return (
    <div id="app-shell" dir="rtl">
      <header class="dor-topbar">
        <h1 class="dor-logo">{t('appShell.appName')}</h1>
      </header>
      <main id="main-outlet">{props.children}</main>
      <BottomNav />
    </div>
  );
}

export function App(): JSX.Element {
  const { orchestrator } = useShell();
  const [onboarded, setOnboarded] = useState(orchestrator.isOnboarded());

  useEffect(() => {
    if (onboarded) {
      // پیش‌بارگذاری هوشمند صفحه‌های ثانویه در idle (Doherty < 100ms)
      preloadSecondaryScreens(globalThis as unknown as Parameters<typeof preloadSecondaryScreens>[0]);
    }
  }, [onboarded]);

  if (!onboarded) {
    return <Onboarding onDone={() => setOnboarded(true)} />;
  }

  return (
    <LocationProvider>
      <ScreenTracker />
      <Shell>
        <ResumeBanner />
        <ErrorBoundary>
          <Router>
            {/* «/» منوی اصلی است — کاربر باید یک اپ ببیند، نه اینکه
                بی‌مقدمه داخل تخته‌ی بازی پرتاب شود. */}
            <Route path="/" component={Home} />
            <Route path="/daily" component={() => <GameRoute mode="daily" />} />
            <Route path="/levels" component={LevelsScreen} />
            <Route path="/practice" component={() => <GameRoute mode="practice" />} />
            <Route path="/stats" component={StatsRoute} />
            <Route path="/album" component={AlbumRoute} />
            <Route path="/duel/*" component={DuelScreen} />
            <Route path="/shop" component={ShopScreen} />
            <Route path="/settings" component={SettingsScreen} />
            <Route default component={NotFound} />
          </Router>
        </ErrorBoundary>
      </Shell>
    </LocationProvider>
  );
}
