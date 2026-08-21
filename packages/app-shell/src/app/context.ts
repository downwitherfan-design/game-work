/**
 * کانتکست سراسری پوسته — تزریق سرویس‌ها به درخت Preact.
 */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { EventBus } from '@dordaneh/contracts';
import type { ShellServices } from '../services/registry';
import type { Orchestrator } from '../services/orchestrator';
import type { ShellStorage } from '../core/storage';
import type { ThemeManager, ShellSettings } from '../core/theme';

export interface ShellContext {
  bus: EventBus;
  services: ShellServices;
  orchestrator: Orchestrator;
  storage: ShellStorage;
  theme: ThemeManager;
  settings: ShellSettings;
  updateSettings(patch: Partial<ShellSettings>): void;
}

export const AppContext = createContext<ShellContext | null>(null);

export function useShell(): ShellContext {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useShell must be used within AppContext.Provider');
  return ctx;
}
