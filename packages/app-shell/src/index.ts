// @dordaneh/app-shell — مالک: AI-05. پیاده‌سازی طبق docs/02_CONTRACTS.md.
// نقطه‌ی ورود: در مرورگر بوت می‌کند؛ در محیط تست/SSR فقط API صادر می‌کند.
import './app/shell.css';
import { bootstrap } from './app/bootstrap';

// API عمومی پوسته (برای تست و ابزارها)
export { getBus } from './core/bus';
export { createShellStorage, createCapacitorStorage } from './core/storage';
export {
  createThemeManager,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type ShellSettings,
  type ThemePreference,
} from './core/theme';
export { createServices, type ShellServices } from './services/registry';
export { createOrchestrator, SHELL_KEYS, type Orchestrator } from './services/orchestrator';
export { t, setLocale, getLocale } from './core/i18n';
export { bootstrap } from './app/bootstrap';

// بوت خودکار فقط در مرورگر واقعی (نه vitest/SSR)
const isBrowser =
  typeof document !== 'undefined' &&
  typeof (globalThis as { __DOR_NO_AUTOBOOT__?: boolean }).__DOR_NO_AUTOBOOT__ === 'undefined' &&
  !('__vitest_worker__' in globalThis);

if (isBrowser) {
  void bootstrap({ doc: document });
}
