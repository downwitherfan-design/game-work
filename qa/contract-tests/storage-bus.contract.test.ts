/**
 * اجرای suite قرارداد StorageApi و EventBus روی پیاده‌سازی‌های مرجعِ خود contracts
 * (createMemoryStorage / createWebStorage / createEventBus) — این‌ها API عمومی قراردادند.
 */

import { createEventBus, createMemoryStorage, createWebStorage } from '@dordaneh/contracts';
import {
  runEventBusContractSuite,
  runStorageContractSuite,
} from '../src/contract-suites/storage-bus.suite';

runStorageContractSuite('memory-storage', {
  makeStorage: () => createMemoryStorage(),
});

/** شبیه‌ساز ساده‌ی localStorage برای تست createWebStorage در Node */
function makeFakeWebStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => {
      m.set(k, v);
    },
  };
}

runStorageContractSuite('web-storage(localStorage-like)', {
  makeStorage: () => createWebStorage(makeFakeWebStorage()),
});

runEventBusContractSuite('reference-bus', {
  makeBus: () => createEventBus(),
});
