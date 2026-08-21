/**
 * EventBus سراسری پوسته — نمونه‌ی واحد از پیاده‌سازی مرجع قرارداد (§5).
 * app-shell تنها میزبان bus است؛ بقیه‌ی پکیج‌ها فقط تایپ EventBus را مصرف می‌کنند.
 */
import { createEventBus, type EventBus } from '@dordaneh/contracts';

let singleton: EventBus | null = null;

export function getBus(): EventBus {
  if (!singleton) singleton = createEventBus();
  return singleton;
}

/** فقط برای تست — ریست نمونه‌ی سراسری */
export function resetBusForTests(): void {
  singleton = null;
}
