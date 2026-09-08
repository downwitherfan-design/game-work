/**
 * بوت پوسته: ساخت bus/storage/theme/services/orchestrator، تزریق کانتکست،
 * رندر App و ثبت service worker (PWA آفلاین-اول، خط قرمز ۱۸).
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
// ⚠️ دیزاین‌سیستم واقعی (AI-04). این دو import اجباری است: بدون آن‌ها
// هیچ‌کدام از متغیرهای --dor-* تعریف نمی‌شوند و کاشی‌های بازی
// بی‌رنگ و نامرئی دیده می‌شوند (باگی که در نسخه‌ی نصب‌شده دیده شد).
import '@dordaneh/ui-kit/src/tokens.css';
import '@dordaneh/ui-kit/src/ui-kit.css';
import { getBus } from '../core/bus';
import { createShellStorage } from '../core/storage';
import {
  createThemeManager,
  loadSettings,
  saveSettings,
  type ShellSettings,
} from '../core/theme';
import { setLocale } from '../core/i18n';
import { createServices } from '../services/registry';
import { createOrchestrator } from '../services/orchestrator';
import { AppContext, type ShellContext } from './context';
import { App } from './App';

function Root(props: { ctx: Omit<ShellContext, 'settings' | 'updateSettings'>; initial: ShellSettings }): JSX.Element {
  const [settings, setSettings] = useState(props.initial);
  const ctx: ShellContext = {
    ...props.ctx,
    settings,
    updateSettings(patch) {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveSettings(props.ctx.storage, next);
        return next;
      });
    },
  };
  return (
    <AppContext.Provider value={ctx}>
      <App />
    </AppContext.Provider>
  );
}

export interface BootOptions {
  doc: Document;
  registerSw?: boolean;
}

/**
 * CSS برد بازی را از پکیج مالک (AI-06) می‌گیرد و یک‌بار در head تزریق می‌کند.
 * اگر پکیج در دسترس نبود، بوت نباید بشکند.
 */
async function injectGameBoardCss(doc: Document): Promise<void> {
  if (doc.getElementById('dor-game-board-css')) return;
  try {
    const mod = (await import('@dordaneh/game-board')) as Record<string, unknown>;
    const css = mod['GAME_BOARD_CSS'];
    if (typeof css !== 'string' || css.length === 0) return;
    const style = doc.createElement('style');
    style.id = 'dor-game-board-css';
    style.textContent = css;
    doc.head.appendChild(style);
  } catch {
    // پکیج برد بازی در دسترس نیست — بقیه‌ی اپ باید کار کند
  }
}

export async function bootstrap(opts: BootOptions): Promise<void> {
  const { doc } = opts;

  const bus = getBus();
  const storage = createShellStorage(globalThis);
  await storage.hydrate(); // در native، کش Preferences را پر می‌کند؛ در وب فوری

  const settings = loadSettings(storage);
  setLocale(settings.locale);

  const theme = createThemeManager(
    {
      root: doc.documentElement,
      matchMedia: globalThis.matchMedia?.bind(globalThis),
    },
    settings,
  );

  const services = createServices(bus, storage);
  services.audio.setSfxEnabled(settings.sfx);
  services.audio.setMusicEnabled(settings.music);

  const orchestrator = createOrchestrator(bus, services, storage);

  // ⚠️ CSS برد بازی (AI-06) فقط به‌صورت رشته صادر می‌شود و مصرف‌کننده
  // باید خودش تزریقش کند. قبلاً فقط در demo تزریق می‌شد، پس در اپ
  // واقعی کاشی‌ها و کیبورد بدون استایل رندر می‌شدند.
  await injectGameBoardCss(doc);

  const mount = doc.getElementById('app');
  if (!mount) {
    console.error('[app-shell] #app mount point not found');
    return;
  }
  render(<Root ctx={{ bus, storage, theme, services, orchestrator }} initial={settings} />, mount);
  // splash را مخفی کن تا UI واقعی دیده شود (RFC-0015)
  const w = globalThis as { __hideSplash?: () => void };
  if (typeof w.__hideSplash === "function") w.__hideSplash();

  if (opts.registerSw !== false && 'serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // نبود sw (مثلاً dev) نباید بوت را بشکند
    }
  }
}
