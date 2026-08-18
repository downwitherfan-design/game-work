/**
 * ShareSheet — کامپوننت صادراتی UI اشتراک.
 *
 * پیش‌نمایش گرید/کارت + دکمه‌های اشتراک/کپی/تلگرام/واتساپ/دانلود تصویر.
 * رویدادهای share_initiated / share_completed روی EventBus (قیف AI-12).
 *
 * ⚠️ پیاده‌سازی فعلی: DOM-factory بدون فریم‌ورک — چون preact هنوز در
 * lockfile مونوریپو نصب نیست (lockfile مال AI-14؛ RFC-0007 ثبت شد).
 * پس از تأیید RFC، یک wrapper نازک Preact دور همین factory صادر می‌شود؛
 * API عمومی (mountShareSheet) تغییری نمی‌کند.
 *
 * استایل: فقط CSS variables قرارداد ui-kit (§4) — هیچ hex هاردکد.
 * RTL-first: dir="rtl" + خصوصیات logical.
 *
 * 💡 لحظه‌ی طلایی: میزبان (game-board/app-shell) باید این شیت را دقیقاً
 * بعد از انیمیشن برد باز کند، نه در مودال سرد آمار — هیجان فیزیولوژیک
 * بالا = اشتراک بیشتر (Berger & Milkman, JMR 2012).
 */

import type { CultureCard, EventBus, PuzzleState, TranslateFn } from '@dordaneh/contracts';
import { defaultT } from './i18n';
import { telegramShareUrl, whatsappShareUrl } from './links';
import type { ViralShareApi } from './share-api';

export interface ShareSheetProps {
  api: ViralShareApi;
  state: PuzzleState;
  /** کارت فرهنگی برای تب «کارت» (اختیاری) */
  card?: CultureCard;
  eventBus?: EventBus;
  t?: TranslateFn;
  onClose?: () => void;
}

export interface ShareSheetHandle {
  el: HTMLElement;
  destroy(): void;
}

const STYLE_ID = 'dor-share-sheet-style';

/** استایل شیت — یک‌بار تزریق می‌شود؛ فقط توکن‌های قراردادی */
const CSS = `
.dor-share-sheet{direction:rtl;font-family:var(--dor-font);background:var(--dor-bg);
 border-radius:var(--dor-radius);padding:var(--dor-space-4);max-inline-size:420px;
 margin-inline:auto;box-shadow:0 8px 32px rgb(0 0 0 / 0.18)}
[data-theme="dark"] .dor-share-sheet{background:var(--dor-dark-bg);color:var(--dor-bg)}
.dor-share-sheet__title{font-weight:700;margin-block-end:var(--dor-space-3);text-align:center}
.dor-share-sheet__preview{white-space:pre-line;text-align:center;line-height:1.9;
 background:color-mix(in srgb, var(--dor-absent) 18%, transparent);
 border-radius:var(--dor-radius);padding:var(--dor-space-3);
 margin-block-end:var(--dor-space-3);user-select:all}
.dor-share-sheet__card-preview{inline-size:100%;border-radius:var(--dor-radius);
 margin-block-end:var(--dor-space-3);display:block}
.dor-share-sheet__buttons{display:flex;flex-wrap:wrap;gap:var(--dor-space-2);
 justify-content:center}
.dor-share-sheet__btn{font-family:var(--dor-font);font-size:1rem;cursor:pointer;
 border:none;border-radius:var(--dor-radius);padding:var(--dor-space-2) var(--dor-space-3);
 background:var(--dor-accent);color:var(--dor-bg);min-block-size:44px}
.dor-share-sheet__btn--primary{background:var(--dor-correct);font-weight:700;
 inline-size:100%}
.dor-share-sheet__btn--ghost{background:transparent;color:var(--dor-accent);
 border:1px solid var(--dor-accent)}
.dor-share-sheet__toast{position:fixed;inset-block-end:var(--dor-space-4);
 inset-inline-start:50%;transform:translateX(50%);background:var(--dor-dark-bg);
 color:var(--dor-bg);padding:var(--dor-space-2) var(--dor-space-3);
 border-radius:var(--dor-radius);z-index:1000;font-family:var(--dor-font)}
`;

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  doc.head.appendChild(s);
}

function showToast(doc: Document, message: string): void {
  const el = doc.createElement('output');
  el.className = 'dor-share-sheet__toast';
  el.textContent = message;
  doc.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function button(
  doc: Document,
  label: string,
  variant: 'primary' | 'default' | 'ghost',
  onClick: () => void,
): HTMLButtonElement {
  const b = doc.createElement('button');
  b.type = 'button';
  b.className =
    'dor-share-sheet__btn' +
    (variant === 'primary'
      ? ' dor-share-sheet__btn--primary'
      : variant === 'ghost'
        ? ' dor-share-sheet__btn--ghost'
        : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/**
 * ساخت و اتصال ShareSheet به یک container.
 * میزبان: app-shell / game-board — بعد از انیمیشن برد صدا بزند.
 */
export function mountShareSheet(container: HTMLElement, props: ShareSheetProps): ShareSheetHandle {
  const doc = container.ownerDocument;
  const t = props.t ?? defaultT;
  const bus = props.eventBus;
  ensureStyle(doc);

  const root = doc.createElement('section');
  root.className = 'dor-share-sheet';
  root.setAttribute('dir', 'rtl');
  root.setAttribute('aria-label', t('viralShare.previewLabel'));
  root.id = 'share-sheet';

  const title = doc.createElement('h2');
  title.className = 'dor-share-sheet__title';
  title.textContent = t('viralShare.previewLabel');
  root.appendChild(title);

  // ── پیش‌نمایش گرید بی‌اسپویلر
  const gridText = props.api.buildResultGrid(props.state);
  const preview = doc.createElement('pre');
  preview.className = 'dor-share-sheet__preview';
  preview.id = 'share-grid-preview';
  preview.textContent = gridText;
  root.appendChild(preview);

  // ── پیش‌نمایش کارت فرهنگی (رندر async — بیلبورد استوری)
  let cardObjectUrl: string | null = null;
  if (props.card) {
    const img = doc.createElement('img');
    img.className = 'dor-share-sheet__card-preview';
    img.id = 'share-card-preview';
    img.alt = props.card.title;
    root.appendChild(img);
    void props.api
      .renderCard(props.card, 'post')
      .then((blob) => {
        cardObjectUrl = URL.createObjectURL(blob);
        img.src = cardObjectUrl;
      })
      .catch(() => img.remove());
  }

  // ── دکمه‌ها
  const buttons = doc.createElement('nav');
  buttons.className = 'dor-share-sheet__buttons';
  buttons.id = 'share-buttons';

  buttons.appendChild(
    button(doc, t('viralShare.shareButton'), 'primary', () => {
      void props.api.shareResult(props.state);
    }),
  );

  buttons.appendChild(
    button(doc, t('viralShare.copyButton'), 'default', () => {
      bus?.emit({ type: 'share_initiated', surface: 'result' });
      void doc.defaultView?.navigator.clipboard?.writeText(gridText).then(() => {
        showToast(doc, t('viralShare.copiedToast'));
        bus?.emit({ type: 'share_completed', surface: 'result' });
      });
    }),
  );

  buttons.appendChild(
    button(doc, t('viralShare.telegramButton'), 'default', () => {
      bus?.emit({ type: 'share_initiated', surface: 'result' });
      doc.defaultView?.open(telegramShareUrl(gridText), '_blank', 'noopener');
      bus?.emit({ type: 'share_completed', surface: 'result' });
    }),
  );

  buttons.appendChild(
    button(doc, t('viralShare.whatsappButton'), 'default', () => {
      bus?.emit({ type: 'share_initiated', surface: 'result' });
      doc.defaultView?.open(whatsappShareUrl(gridText), '_blank', 'noopener');
      bus?.emit({ type: 'share_completed', surface: 'result' });
    }),
  );

  if (props.card) {
    const card = props.card;
    buttons.appendChild(
      button(doc, t('viralShare.shareCardButton'), 'default', () => {
        void props.api.shareCard(card);
      }),
    );
  }

  if (props.onClose) {
    const onClose = props.onClose;
    buttons.appendChild(button(doc, t('viralShare.close'), 'ghost', onClose));
  }

  root.appendChild(buttons);
  container.appendChild(root);

  return {
    el: root,
    destroy(): void {
      if (cardObjectUrl) URL.revokeObjectURL(cardObjectUrl);
      root.remove();
    },
  };
}
