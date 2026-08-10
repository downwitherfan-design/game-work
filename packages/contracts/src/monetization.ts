/**
 * @dordaneh/contracts — MonetizationApi contract (implemented by AI-11 in @dordaneh/monetization).
 * Source of truth: docs/02_CONTRACTS.md §10. Locked (RFC only).
 * قواعد اخلاقی: هرگز pay-to-win، هرگز تبلیغ اجباری، هرگز در جلسه‌ی اول.
 */

export type Sku =
  | 'golden'
  | 'pack_cooking'
  | 'pack_cinema'
  | 'pack_sport'
  | 'pack_classic'
  | 'theme_pack_1';

export type RewardedPlacement = 'extra_guess' | 'hint';
export type RewardedResult = 'rewarded' | 'skipped' | 'unavailable';
export type PurchaseResult = 'ok' | 'cancelled' | 'error';

export interface MonetizationApi {
  isGolden(): boolean;
  ownsSku(sku: Sku): boolean;
  showRewardedAd(placement: RewardedPlacement): Promise<RewardedResult>;
  purchase(sku: Sku): Promise<PurchaseResult>;
}
