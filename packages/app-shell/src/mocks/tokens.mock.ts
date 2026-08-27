/**
 * Mock توکن‌های دیزاین‌سیستم — مقادیر عیناً از قرارداد §4 (مالک واقعی: AI-04).
 * تا آماده‌شدن @dordaneh/ui-kit تزریق می‌شود؛ اگر ui-kit استایل خودش را ثبت
 * کرده باشد (متغیر --dor-bg تعریف شده)، این mock کاری نمی‌کند.
 * (رنگ‌ها hex «هاردکد» نیستند — کپی امانت‌دارانه‌ی CSS Variables خود قرارداد.)
 */
export const CONTRACT_TOKENS_CSS = `
:root{
--dor-bg:#F7F3E9; --dor-correct:#4CAF7D; --dor-present:#E5A83B;
--dor-absent:#B7B0A3; --dor-accent:#1CA9A6; --dor-gold:#D4AF37;
--dor-dark-bg:#1B2430; --dor-dark-accent:#0E6E6B;
--dor-font:'Vazirmatn',sans-serif; --dor-radius:12px;
--dor-space-1:4px; --dor-space-2:8px; --dor-space-3:16px; --dor-space-4:24px;
--dor-fg:#2b2620; --dor-surface:#ffffff;
}
[data-theme="dark"]{
--dor-bg:var(--dor-dark-bg); --dor-accent:var(--dor-dark-accent);
--dor-fg:#e8e4da; --dor-surface:#243040;
}
[data-colorblind="true"] .dor-tile[data-state="correct"]::after{content:'✓';}
[data-colorblind="true"] .dor-tile[data-state="present"]::after{content:'•';}
`;

export function injectMockTokens(doc: Document): void {
  const probe = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue('--dor-bg');
  if (probe && probe.trim() !== '') return; // ui-kit واقعی حاضر است
  if (doc.getElementById('dor-mock-tokens')) return;
  const style = doc.createElement('style');
  style.id = 'dor-mock-tokens';
  style.textContent = CONTRACT_TOKENS_CSS;
  doc.head.appendChild(style);
}
