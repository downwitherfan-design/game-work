/** Switch — کلید روشن/خاموش دسترس‌پذیر (checkbox واقعی + track/thumb بصری، لمس ≥44px). */
import type { JSX } from 'preact';

export type SwitchVariant = 'default';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  variant?: SwitchVariant;
  class?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  class: className,
}: SwitchProps): JSX.Element {
  return (
    <label class={['dor-switch', className ?? ''].filter(Boolean).join(' ')} data-dor="switch">
      <input
        type="checkbox"
        class="dor-switch__input"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange?.((e.currentTarget as HTMLInputElement).checked)}
      />
      <span class="dor-switch__track" aria-hidden="true">
        <span class="dor-switch__thumb" />
      </span>
      {label ? <span class="dor-switch__label">{label}</span> : null}
    </label>
  );
}
