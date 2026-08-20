/**
 * ⚠️ آداپتور موقت ui-kit — @dordaneh/ui-kit هنوز کامپوننت صادر نمی‌کند (فاز ۰).
 * طبق خط قرمز ۲: «با قرارداد فعلی کار کن (در ماژول خودت آداپتور موقت بنویس)».
 * وقتی AI-04 کامپوننت‌های ProgressRing/Toast/Modal را صادر کرد، این فایل فقط
 * re-export می‌شود و کد Screen ها دست نمی‌خورد.
 * همه‌ی رنگ/فونت/فاصله فقط از CSS variables قراردادی (خط قرمز ۲۵).
 */
import type { ComponentChildren, VNode } from 'preact';

export interface ProgressRingProps {
  /** ۰..۱ */
  progress: number;
  size?: number;
  label?: string;
}

/** حلقه‌ی پیشرفت SVG — فقط توکن‌های قراردادی */
export function ProgressRing(props: ProgressRingProps): VNode {
  const size = props.size ?? 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, props.progress));
  return (
    <svg
      class="mr-progress-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={props.label ?? ''}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--dor-absent)"
        stroke-opacity="0.35"
        stroke-width={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--dor-accent)"
        stroke-width={stroke}
        stroke-linecap="round"
        stroke-dasharray={`${c * clamped} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style="transition: stroke-dasharray 0.6s ease"
      />
      {props.label !== undefined && (
        <text
          x="50%"
          y="50%"
          dominant-baseline="central"
          text-anchor="middle"
          fill="currentColor"
          font-family="var(--dor-font)"
          font-size={size / 4.2}
          font-weight="700"
        >
          {props.label}
        </text>
      )}
    </svg>
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
  labelledBy?: string;
}

/** مودال سبک با بک‌دراپ — تپ روی بک‌دراپ = بستن */
export function Modal(props: ModalProps): VNode | null {
  if (!props.open) return null;
  return (
    <div
      class="mr-modal-backdrop"
      onClick={(e: { target: unknown; currentTarget: unknown }) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="mr-modal" role="dialog" aria-modal="true" aria-labelledby={props.labelledBy}>
        {props.children}
      </div>
    </div>
  );
}

export interface ButtonProps {
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'gold';
  children: ComponentChildren;
  ariaLabel?: string;
  id?: string;
}

export function Button(props: ButtonProps): VNode {
  const variant = props.variant ?? 'primary';
  return (
    <button
      id={props.id}
      type="button"
      class={`mr-btn mr-btn--${variant}`}
      onClick={props.onClick}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </button>
  );
}

/** استایل مشترک Screen ها — یک‌بار تزریق می‌شود (توکن‌ها فقط var قراردادی) */
export const SHARED_CSS = `
.mr-screen{direction:rtl;font-family:var(--dor-font);padding:var(--dor-space-3);max-width:520px;margin-inline:auto;color:inherit}
.mr-screen h1{font-size:1.3rem;margin:0 0 var(--dor-space-3)}
.mr-screen h2{font-size:1.05rem;margin:var(--dor-space-4) 0 var(--dor-space-2)}
.mr-card{background:var(--dor-bg);border-radius:var(--dor-radius);padding:var(--dor-space-3);box-shadow:0 1px 4px rgba(0,0,0,.08)}
[data-theme="dark"] .mr-card{background:var(--dor-dark-bg)}
.mr-btn{font-family:var(--dor-font);border:none;border-radius:var(--dor-radius);padding:var(--dor-space-2) var(--dor-space-3);font-size:1rem;cursor:pointer;transition:transform .08s ease}
.mr-btn:active{transform:scale(.97)}
.mr-btn--primary{background:var(--dor-accent);color:var(--dor-bg)}
.mr-btn--ghost{background:transparent;color:var(--dor-accent);border:1px solid var(--dor-accent)}
.mr-btn--gold{background:var(--dor-gold);color:var(--dor-dark-bg)}
.mr-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:50;padding:var(--dor-space-3)}
.mr-modal{background:var(--dor-bg);border-radius:var(--dor-radius);padding:var(--dor-space-4);max-width:420px;width:100%;max-height:85vh;overflow-y:auto;direction:rtl;font-family:var(--dor-font)}
[data-theme="dark"] .mr-modal{background:var(--dor-dark-bg)}
`;
