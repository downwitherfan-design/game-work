/**
 * بوت پوسته: ساخت bus/storage/theme/services/orchestrator، تزریق کانتکست،
 * رندر App و ثبت service worker (PWA آفلاین-اول، خط قرمز ۱۸).
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
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
import { injectMockTokens } from '../mocks/tokens.mock';
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

  injectMockTokens(doc); // فقط تا آماده‌شدن ui-kit واقعی اثر دارد

  const mount = doc.getElementById('app');
  if (!mount) {
    console.error('[app-shell] #app mount point not found');
    return;
  }
  render(<Root ctx={{ bus, storage, theme, services, orchestrator }} initial={settings} />, mount);

  if (opts.registerSw !== false && 'serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // نبود sw (مثلاً dev) نباید بوت را بشکند
    }
  }
}
