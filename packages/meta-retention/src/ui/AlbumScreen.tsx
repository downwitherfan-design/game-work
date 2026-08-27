/**
 * AlbumScreen «گنجینه» — route /album (قرارداد §6، مالک AI-08).
 *  - گرید کارت‌ها: کشف‌شده رنگی، کشف‌نشده سیلوئت «؟» (اثر زایگارنیک ۱۹۲۷).
 *  - شمارنده «۳۴ از ۳۰۰» + ProgressRing.
 *  - بخش «مرور امروز»: ۳ کارت با فواصل افزایشی ۱/۳/۷/۱۴ روز (اثر فاصله‌گذاری —
 *    Ebbinghaus 1885; Cepeda et al. 2006) → ارزش کاربردی برای اشتراک (Berger 2013).
 *  - در اولین بازدید: هدیه‌ی پیشرفت اعطاشده (Nunes & Drèze 2006).
 *  - تپ روی کارت = نمای کامل + دکمه‌ی اشتراک کارت (share_initiated: 'card').
 */
import type { VNode } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
  toPersianDigits,
  type CultureApi,
  type CultureCard,
  type EventBus,
  type TranslateFn,
} from '@dordaneh/contracts';
import type { MetaRetentionApi } from '../service';
import { t as defaultT } from '../i18n';
import { Button, Modal, ProgressRing, SHARED_CSS } from './kit-adapter';

export interface AlbumScreenProps {
  meta: MetaRetentionApi;
  culture: CultureApi;
  bus: EventBus;
  t?: TranslateFn;
}

const ALBUM_CSS = `
${SHARED_CSS}
#album-header{display:flex;align-items:center;gap:var(--dor-space-3);margin-bottom:var(--dor-space-3)}
#review-section .mr-review-row{display:flex;flex-direction:column;gap:var(--dor-space-2)}
.mr-review-card{display:flex;justify-content:space-between;align-items:center;gap:var(--dor-space-2)}
.mr-review-body{font-size:.86rem;flex:1}
#album-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--dor-space-2)}
.mr-tile{aspect-ratio:3/4;border-radius:var(--dor-radius);border:none;cursor:pointer;font-family:var(--dor-font);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--dor-space-1);padding:var(--dor-space-2);text-align:center;transition:transform .1s ease}
.mr-tile:active{transform:scale(.96)}
.mr-tile--found{background:var(--dor-accent);color:var(--dor-bg)}
.mr-tile--gold{background:var(--dor-gold);color:var(--dor-dark-bg);box-shadow:0 0 0 2px var(--dor-gold)}
.mr-tile--locked{background:var(--dor-absent);color:var(--dor-bg);opacity:.55}
.mr-tile-q{font-size:1.6rem;font-weight:800}
.mr-tile-title{font-size:.68rem;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.mr-tile-kind{font-size:1.2rem}
#card-view h3{margin:0 0 var(--dor-space-2)}
#card-view .mr-card-body{font-size:1rem;line-height:1.9;margin-bottom:var(--dor-space-2)}
#card-view .mr-card-expl{font-size:.85rem;opacity:.85;margin-bottom:var(--dor-space-2)}
#card-view .mr-card-src{font-size:.72rem;opacity:.6;margin-bottom:var(--dor-space-3)}
#card-view .mr-gold-badge{color:var(--dor-gold);font-size:.8rem;font-weight:700;margin-bottom:var(--dor-space-2)}
.mr-modal-actions{display:flex;gap:var(--dor-space-2);justify-content:flex-start}
`;

const KIND_ICON: Record<CultureCard['kind'], string> = {
  proverb: '🗣️',
  poem: '📜',
  fact: '💡',
  occasion: '🎉',
};

export function AlbumScreen(props: AlbumScreenProps): VNode {
  const t = props.t ?? defaultT;
  const [, forceRender] = useState(0);
  const rerender = (): void => forceRender((n: number) => n + 1);

  // آلبوم کامل از CultureApi (سیلوئت‌ها هم از همین لیست ساخته می‌شوند)
  const albumData = useMemo(() => props.culture.getAlbum(), [props.culture]);

  // پیشرفت اعطاشده: در اولین بازدید ۳ کارت اول هدیه (useMemo = یک‌بار در mount)
  useMemo(() => {
    props.meta.grantEndowed(albumData.cards.slice(0, 3).map((c) => c.id));
    return null;
  }, [props.meta, albumData]);

  const album = props.meta.getAlbum();
  const discoveredCount = Object.keys(album.discovered).length;
  const total = albumData.total;
  const dueIds = props.meta.getDueReviews();
  const cardById = useMemo(() => {
    const map = new Map<string, CultureCard>();
    for (const c of albumData.cards) map.set(c.id, c);
    return map;
  }, [albumData]);

  const [openCard, setOpenCard] = useState<CultureCard | null>(null);

  const shareCard = (card: CultureCard): void => {
    // viral-share (AI-07) از طریق EventBus/app-shell این را می‌گیرد — بدون import مستقیم UI از UI
    props.bus.emit({ type: 'share_initiated', surface: 'card' });
    void card;
  };

  return (
    <main class="mr-screen" id="album-screen">
      <style>{ALBUM_CSS}</style>
      <header id="album-header">
        <ProgressRing
          progress={total > 0 ? discoveredCount / total : 0}
          size={72}
          label={toPersianDigits(discoveredCount)}
        />
        <div>
          <h1 style="margin:0">{t('metaRetention.album.title')}</h1>
          <p style="margin:4px 0 0;opacity:.75">
            {t('metaRetention.album.progress', {
              discovered: toPersianDigits(discoveredCount),
              total: toPersianDigits(total),
            })}
          </p>
        </div>
      </header>

      <section id="review-section" aria-labelledby="review-title">
        <h2 id="review-title">{t('metaRetention.album.review.title')}</h2>
        {dueIds.length === 0 ? (
          <p class="mr-card" style="font-size:.85rem;opacity:.8">
            {t('metaRetention.album.review.empty')}
          </p>
        ) : (
          <div class="mr-card mr-review-row">
            <p style="margin:0;font-size:.8rem;opacity:.75">{t('metaRetention.album.review.hint')}</p>
            {dueIds.map((id) => {
              const card = cardById.get(id);
              if (!card) return null;
              return (
                <div class="mr-review-card" key={id}>
                  <span class="mr-review-body">
                    {KIND_ICON[card.kind]}{' '}
                    {card.body.length > 60 ? `${card.body.slice(0, 60)}…` : card.body}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      props.meta.markCardReviewed(id);
                      setOpenCard(card);
                      rerender();
                    }}
                  >
                    {t('metaRetention.album.review.done')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label={t('metaRetention.album.title')} style="margin-top:var(--dor-space-3)">
        <div id="album-grid">
          {albumData.cards.map((card) => {
            const found = album.discovered[card.id];
            if (!found) {
              // سیلوئت با «؟» — اثر زایگارنیک: کار ناتمام در ذهن می‌ماند
              return (
                <div class="mr-tile mr-tile--locked" key={card.id} aria-hidden="true">
                  <span class="mr-tile-q">{t('metaRetention.album.locked')}</span>
                </div>
              );
            }
            return (
              <button
                type="button"
                class={`mr-tile ${found.golden ? 'mr-tile--gold' : 'mr-tile--found'}`}
                key={card.id}
                onClick={() => setOpenCard(card)}
              >
                <span class="mr-tile-kind">{found.golden ? '💎' : KIND_ICON[card.kind]}</span>
                <span class="mr-tile-title">{card.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Modal open={openCard !== null} onClose={() => setOpenCard(null)} labelledBy="card-view-title">
        {openCard && (
          <article id="card-view">
            {album.discovered[openCard.id]?.golden === true && (
              <p class="mr-gold-badge">💎 {t('metaRetention.album.golden')}</p>
            )}
            <h3 id="card-view-title">
              {KIND_ICON[openCard.kind]} {openCard.title}
            </h3>
            <p class="mr-card-body">{openCard.body}</p>
            {openCard.explanation !== undefined && (
              <p class="mr-card-expl">{openCard.explanation}</p>
            )}
            <p class="mr-card-src">{t('metaRetention.album.source', { source: openCard.source })}</p>
            <div class="mr-modal-actions">
              <Button id="share-card-btn" variant="gold" onClick={() => shareCard(openCard)}>
                {t('metaRetention.album.share')}
              </Button>
              <Button variant="ghost" onClick={() => setOpenCard(null)}>
                {t('metaRetention.album.close')}
              </Button>
            </div>
          </article>
        )}
      </Modal>
    </main>
  );
}
