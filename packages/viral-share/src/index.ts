/**
 * @dordaneh/viral-share — موتور وایرال و اشتراک‌گذاری (مالک: AI-07).
 * پیاده‌سازی قرارداد ShareApi از docs/02_CONTRACTS.md §12.
 *
 * Entry point رسمی — دیگران فقط از همین‌جا import می‌کنند.
 */

// کارخانه‌ی اصلی ShareApi
export { createShareApi, type ViralShareApi } from './share-api';

// UI اشتراک
export { mountShareSheet, type ShareSheetHandle, type ShareSheetProps } from './share-sheet';

// سازنده‌های سطح پایین (برای تست/مصرف پیشرفته‌ی app-shell)
export {
  buildResultGridText,
  DEFAULT_THEME,
  jalaliMonthDay,
  OCCASION_THEMES,
  puzzleNumberFromId,
  RLM,
  themeForDate,
  type GridBuildContext,
} from './grid';
export {
  buildInviteLinkUrl,
  DEFAULT_BASE_URL,
  duelChallengeText,
  telegramShareUrl,
  whatsappShareUrl,
} from './links';
export {
  browserShareEnv,
  shareImageWithFallback,
  shareTextWithFallback,
  type ShareEnv,
  type ShareOutcome,
} from './share-channels';
export { CARD_SIZES, isLegendary, renderCultureCard, TOKENS, wrapPersianText } from './card-renderer';

// تایپ‌های عمومی پکیج
export type {
  CanvasFactory,
  CardFormat,
  CardRenderResult,
  GridTheme,
  MinimalCanvas,
  MinimalCanvas2D,
  ShareOptions,
} from './types';
