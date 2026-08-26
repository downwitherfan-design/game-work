/** Toast — پیام کوتاه بالای صفحه با aria-live (اعلان به صفحه‌خوان). */
import type { JSX } from 'preact';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  /** نمایش/عدم نمایش — کنترل زمان‌بندی با فراخواننده است */
  open?: boolean;
  class?: string;
}

export function Toast({
  message,
  variant = 'default',
  open = true,
  class: className,
}: ToastProps): JSX.Element | null {
  if (!open) return null;
  return (
    <div
      class={['dor-toast', variant !== 'default' ? `dor-toast--${variant}` : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      data-dor="toast"
    >
      {message}
    </div>
  );
}
