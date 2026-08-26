/** Modal — دیالوگ مرکزی با backdrop، دکمه‌ی بستن ≥44px و نقش‌های ARIA. */
import type { ComponentChildren, JSX } from 'preact';
import { t } from '../i18n';

export type ModalVariant = 'default' | 'celebration';

export interface ModalProps {
  open: boolean;
  title?: string;
  variant?: ModalVariant;
  onClose?: () => void;
  /** با کلیک روی backdrop بسته شود؟ (پیش‌فرض: بله) */
  dismissOnBackdrop?: boolean;
  class?: string;
  children?: ComponentChildren;
}

export function Modal({
  open,
  title,
  variant = 'default',
  onClose,
  dismissOnBackdrop = true,
  class: className,
  children,
}: ModalProps): JSX.Element | null {
  if (!open) return null;
  return (
    <div
      class="dor-modal-backdrop"
      onClick={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
      data-dor="modal-backdrop"
    >
      <div
        class={['dor-modal', `dor-modal--${variant}`, className ?? ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-dor="modal"
      >
        <div class="dor-modal__header">
          {onClose ? (
            <button
              type="button"
              class="dor-modal__close"
              onClick={onClose}
              aria-label={t('uiKit.modal.close')}
            >
              ✕
            </button>
          ) : null}
          {title ? <h2 class="dor-modal__title">{title}</h2> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
