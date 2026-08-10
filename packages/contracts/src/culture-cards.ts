/**
 * @dordaneh/contracts — CultureApi contract (implemented by AI-03 in @dordaneh/culture-cards).
 * Source of truth: docs/02_CONTRACTS.md §3. Locked (RFC only).
 */

export type CardKind = 'proverb' | 'poem' | 'fact' | 'occasion';

export interface CultureCard {
  id: string;
  kind: CardKind;
  /** مثل: «ضرب‌المثل روز» */
  title: string;
  /** متن اصلی (شعر/مثل/دانستنی) */
  body: string;
  /** توضیح کوتاه ≤ ۲۲۰ نویسه */
  explanation?: string;
  /** منبع مستند — اجباری */
  source: string;
  /** کلمه‌ی معمای مرتبط (نرمال) */
  relatedWord?: string;
  /** 'MM-DD' شمسی برای مناسبت‌ها */
  occasionDate?: string;
  /** متن آماده‌ی اشتراک ≤ ۱۴۰ نویسه */
  shareCaption: string;
}

export interface CultureApi {
  getCardForPuzzle(puzzleNumber: number, solutionWord: string): CultureCard;
  /** برای «گنجینه» */
  getAlbum(): { total: number; cards: CultureCard[] };
}
