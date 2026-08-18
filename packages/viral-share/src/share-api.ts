/**
 * کارخانه‌ی ShareApi — پیاده‌سازی قرارداد docs/02_CONTRACTS.md §12.
 *
 * رویدادهای share_initiated / share_completed روی EventBus منتشر می‌شوند
 * (قیف آنالیتیکس AI-12 از همان‌جا گوش می‌دهد — قرارداد §8).
 */

import type { CultureCard, PuzzleState, ShareApi } from '@dordaneh/contracts';
import { browserCanvasFactory, renderCultureCard } from './card-renderer';
import { buildResultGridText, themeForDate, type GridBuildContext } from './grid';
import { defaultT } from './i18n';
import { buildInviteLinkUrl, DEFAULT_BASE_URL } from './links';
import {
  browserDownload,
  browserShareEnv,
  shareImageWithFallback,
  shareTextWithFallback,
  type ShareEnv,
} from './share-channels';
import type { CanvasFactory, ShareOptions } from './types';

/** ShareApi توسعه‌یافته‌ی داخلی (سوپرست سازگار با قرارداد) */
export interface ViralShareApi extends ShareApi {
  /** رندر خام کارت — برای پیش‌نمایش در ShareSheet */
  renderCard(card: CultureCard, format: 'story' | 'post'): Promise<Blob>;
}

export function createShareApi(options: ShareOptions = {}, env?: ShareEnv): ViralShareApi {
  const t = options.t ?? defaultT;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const now = options.now ?? ((): Date => new Date());
  const canvasFactory: CanvasFactory =
    options.canvasFactory ?? (browserCanvasFactory as unknown as CanvasFactory);
  const bus = options.eventBus;

  function shareEnv(): ShareEnv {
    return env ?? browserShareEnv();
  }

  function gridContext(): GridBuildContext {
    return {
      theme: options.gridTheme ?? themeForDate(now()),
      streak: options.getStreak?.() ?? null,
      appName: t('viralShare.appName'),
      gem: t('viralShare.appGem'),
      lostMark: t('viralShare.lost'),
      streakTemplate: (count) => t('viralShare.streakLine', { count }),
      domain: t('viralShare.domain'),
    };
  }

  return {
    buildResultGrid(state: PuzzleState): string {
      return buildResultGridText(state, gridContext());
    },

    async shareResult(state: PuzzleState): Promise<void> {
      bus?.emit({ type: 'share_initiated', surface: 'result' });
      const text = buildResultGridText(state, gridContext());
      const outcome = await shareTextWithFallback(
        text,
        t('viralShare.shareTitle'),
        shareEnv(),
        t('viralShare.copiedToast'),
      );
      if (outcome !== 'failed') {
        bus?.emit({ type: 'share_completed', surface: 'result' });
      }
    },

    async shareCard(card: CultureCard): Promise<void> {
      bus?.emit({ type: 'share_initiated', surface: 'card' });
      const { blob } = await renderCultureCard(card, 'story', canvasFactory, {
        watermark: t('viralShare.cardWatermark'),
        footer: t('viralShare.storyFooter'),
      });
      const e = shareEnv();
      const download =
        e.download ?? (typeof document === 'undefined' ? undefined : browserDownload);
      const outcome = await shareImageWithFallback(
        blob,
        `dordaneh-card-${card.id}.png`,
        t('viralShare.cardShareTitle'),
        { ...e, download },
      );
      if (outcome !== 'failed') {
        bus?.emit({ type: 'share_completed', surface: 'card' });
      }
    },

    buildInviteLink(kind: 'circle' | 'duel', id: string): string {
      return buildInviteLinkUrl(kind, id, baseUrl);
    },

    renderCard(card: CultureCard, format: 'story' | 'post'): Promise<Blob> {
      return renderCultureCard(card, format, canvasFactory, {
        watermark: t('viralShare.cardWatermark'),
        footer: t('viralShare.storyFooter'),
      }).then((r) => r.blob);
    },
  };
}
