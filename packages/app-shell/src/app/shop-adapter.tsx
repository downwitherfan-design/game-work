/**
 * آداپتور ShopScreen — پل میان قرارداد «کامپوننت Preact» پوسته (AI-05) و
 * API «mount امری» پکیج درآمدزایی (AI-11) که به‌جای کامپوننت،
 * `mountShopScreen(container, deps)` صادر می‌کند.
 *
 * چرا اینجا و نه در پکیج AI-11؟ چون طبق 01_RED_LINES هیچ AI حق تغییر
 * دایرکتوری دیگری را ندارد؛ تطبیق قرارداد وظیفه‌ی لایه‌ی یکپارچه‌سازی
 * (app-shell) است. اگر پکیج در آینده کامپوننت واقعی صادر کند، همان ترجیح
 * داده می‌شود و این آداپتور بی‌اثر می‌ماند.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { useShell } from './context';
import { t } from '../core/i18n';
import { MockShopScreen } from '../mocks/screens.mock';

interface ShopHandleLike {
  refresh?: () => void;
  destroy?: () => void;
}

type MountFn = (
  container: HTMLElement,
  deps: {
    monetization: unknown;
    t: typeof t;
    analytics?: unknown;
  },
) => ShopHandleLike | void;

export function ShopScreenAdapter(): JSX.Element {
  const { services } = useShell();
  const hostRef = useRef<HTMLDivElement | null>(null);
  // null = در حال تلاش، true = mount شد، false = افت به mock
  const [mounted, setMounted] = useState<boolean | null>(null);

  useEffect(() => {
    let handle: ShopHandleLike | void;
    let cancelled = false;

    void (async () => {
      const host = hostRef.current;
      if (!host) return;
      try {
        const mod = (await import('@dordaneh/monetization')) as unknown as Record<string, unknown>;
        const mount = mod['mountShopScreen'];
        if (typeof mount !== 'function') {
          if (!cancelled) setMounted(false);
          return;
        }

        handle = (mount as MountFn)(host, {
          monetization: services.monetization,
          t,
          analytics: services.analytics,
        });
        if (!cancelled) setMounted(true);
      } catch {
        if (!cancelled) setMounted(false);
      }
    })();

    return () => {
      cancelled = true;
      if (handle && typeof handle.destroy === 'function') handle.destroy();
    };
  }, [services]);

  if (mounted === false) return <MockShopScreen />;
  return <div id="shop-host" ref={hostRef} class="dor-shop-host" />;
}
