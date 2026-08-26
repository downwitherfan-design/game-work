/**
 * استایل‌های ShopScreen و مودال رضایت — فقط از CSS Variables دیزاین‌سیستم
 * (قرارداد §4). هیچ hex هاردکد (خط قرمز ۲۵). RTL-first با خصوصیات logical.
 */

export const MONETIZATION_CSS = `
.dor-shop {
  direction: rtl;
  font-family: var(--dor-font);
  background: var(--dor-bg);
  min-height: 100%;
  padding: var(--dor-space-3);
  box-sizing: border-box;
}
.dor-shop__title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 var(--dor-space-1);
}
.dor-shop__subtitle {
  font-size: 0.9rem;
  opacity: 0.75;
  margin: 0 0 var(--dor-space-3);
}
.dor-shop__section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: var(--dor-space-4) 0 var(--dor-space-2);
}
.dor-shop__honesty {
  font-size: 0.8rem;
  opacity: 0.65;
  margin-block-start: var(--dor-space-4);
  text-align: center;
}
.dor-shop-card {
  background: color-mix(in srgb, var(--dor-bg) 70%, white);
  border: 1px solid var(--dor-absent);
  border-radius: var(--dor-radius);
  padding: var(--dor-space-3);
  margin-block-end: var(--dor-space-2);
  display: flex;
  align-items: center;
  gap: var(--dor-space-3);
}
.dor-shop-card--golden {
  border-color: var(--dor-gold);
  box-shadow: 0 0 0 1px var(--dor-gold);
}
.dor-shop-card__emoji { font-size: 1.8rem; }
.dor-shop-card__body { flex: 1; min-width: 0; }
.dor-shop-card__title { font-weight: 700; margin: 0 0 2px; font-size: 0.95rem; }
.dor-shop-card__desc { font-size: 0.8rem; opacity: 0.75; margin: 0; }
.dor-shop-card__badge { font-size: 0.75rem; color: var(--dor-gold); margin-block-start: 4px; }
.dor-btn {
  font-family: var(--dor-font);
  border: none;
  border-radius: var(--dor-radius);
  padding: var(--dor-space-2) var(--dor-space-3);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px; /* هدف لمسی — قانون فیتس */
  transition: transform 80ms ease; /* پاسخ < 100ms */
}
.dor-btn:active { transform: scale(0.97); }
.dor-btn--buy { background: var(--dor-accent); color: var(--dor-bg); }
.dor-btn--buy-golden { background: var(--dor-gold); color: var(--dor-dark-bg); }
.dor-btn--owned { background: var(--dor-correct); color: var(--dor-bg); cursor: default; }
.dor-btn--ghost { background: transparent; color: var(--dor-accent); }
.dor-shop__restore {
  display: block;
  margin: var(--dor-space-3) auto 0;
}
.dor-shop__toast {
  position: fixed;
  inset-block-end: var(--dor-space-4);
  inset-inline: var(--dor-space-3);
  background: var(--dor-dark-bg);
  color: var(--dor-bg);
  border-radius: var(--dor-radius);
  padding: var(--dor-space-3);
  text-align: center;
  font-size: 0.9rem;
  z-index: 60;
}
/* مودال رضایت تبلیغ — شفاف و صادقانه؛ دکمه‌ی رد هم‌اندازه‌ی پذیرش (بدون dark pattern) */
.dor-consent__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  direction: rtl;
  font-family: var(--dor-font);
}
.dor-consent {
  background: var(--dor-bg);
  border-radius: var(--dor-radius);
  padding: var(--dor-space-4);
  max-width: 320px;
  width: calc(100% - var(--dor-space-4) * 2);
  text-align: center;
}
.dor-consent__title { font-size: 1.1rem; font-weight: 700; margin: 0 0 var(--dor-space-2); }
.dor-consent__body { font-size: 0.95rem; margin: 0 0 var(--dor-space-2); }
.dor-consent__remaining { font-size: 0.8rem; opacity: 0.65; margin: 0 0 var(--dor-space-3); }
.dor-consent__actions { display: flex; gap: var(--dor-space-2); }
.dor-consent__actions .dor-btn { flex: 1; }
[data-theme="dark"] .dor-shop { background: var(--dor-dark-bg); color: var(--dor-bg); }
[data-theme="dark"] .dor-shop-card { background: color-mix(in srgb, var(--dor-dark-bg) 80%, white); }
[data-theme="dark"] .dor-consent { background: var(--dor-dark-bg); color: var(--dor-bg); }
`;

let injected = false;

/** تزریق یک‌باره‌ی استایل — idempotent، امن در SSR (بدون DOM → no-op). */
export function ensureStylesInjected(doc?: Document): void {
  const d = doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!d || injected) return;
  if (d.getElementById('dor-monetization-css')) {
    injected = true;
    return;
  }
  const style = d.createElement('style');
  style.id = 'dor-monetization-css';
  style.textContent = MONETIZATION_CSS;
  d.head.appendChild(style);
  injected = true;
}

/** فقط برای تست: ریست فلگ تزریق. */
export function resetStylesInjectedForTest(): void {
  injected = false;
}
