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
      <NavLink href="/" id="nav-daily" label={t('appShell.nav.daily')} active={path === '/'} />
      <NavLink
        href="/practice"
        id="nav-practice"
        label={t('appShell.nav.practice')}
        active={path.startsWith('/practice')}
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
            <Route path="/" component={DailyScreen} />
            <Route path="/practice" component={() => <PracticeScreen mode="practice" />} />
            <Route path="/stats" component={StatsScreen} />
            <Route path="/album" component={AlbumScreen} />
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
