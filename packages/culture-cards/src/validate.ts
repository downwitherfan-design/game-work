/**
 * @dordaneh/culture-cards — منطق اعتبارسنجی محتوای data/cards.json.
 *
 * صفر-وابستگی (حتی به contracts) تا هم در تست‌های CI و هم به‌صورت CLI مستقل
 * (tools/validate.ts) اجرا شود. «خروجی قرمز = کامیت ممنوع».
 *
 * قواعد (خط قرمز دسته‌ی ۵ + قرارداد §3):
 *  - id یکتا با الگوی prv|poe|fct|occ-NNN و هم‌خوان با kind
 *  - source مستند و غیرخالی برای همه‌ی کارت‌ها
 *  - explanation ≤ ۲۲۰ نویسه، shareCaption غیرخالی و ≤ ۱۴۰ نویسه
 *  - occasionDate شمسی 'MM-DD' معتبر — فقط و حتماً برای kind='occasion'
 *  - relatedWord از قبل نرمال (فقط حروف فارسی؛ بدون ي/ك عربی، اعراب، ZWNJ)
 *  - هیچ ي/ك عربی یا اعراب در هیچ فیلد متنی (نگارش فارسی معیار)
 */

export const EXPLANATION_MAX = 220;
export const SHARE_CAPTION_MAX = 140;
/** هدف DoD: حداقل ۳۰۰ کارت معتبر. */
export const MIN_CARDS_TARGET = 300;

const KINDS = ['proverb', 'poem', 'fact', 'occasion'] as const;
type KnownKind = (typeof KINDS)[number];

const ID_PREFIX: Record<KnownKind, string> = {
  proverb: 'prv',
  poem: 'poe',
  fact: 'fct',
  occasion: 'occ',
};

const ID_RE = /^(prv|poe|fct|occ)-\d{3}$/;
/** 'MM-DD' شمسی: ماه ۰۱–۱۲، روز ۰۱–۳۱ (سقف دقیق ماه جداگانه چک می‌شود). */
const OCCASION_DATE_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** حروف عربی ممنوع در همه‌ی فیلدهای متنی: ي، ك، ة. */
const FORBIDDEN_ARABIC_RE = /[\u064A\u0643\u0629]/;
/**
 * اعراب (فتحه/ضمه/کسره/تشدید/تنوین) در title و source ممنوع است؛
 * در body/explanation/shareCaption فقط برای ضرورت خوانش شعر و نام برند
 * «دُردانه» مجاز است (خط قرمز ۳۱: «بدون اعراب غیرضروری»).
 */
const DIACRITICS_RE = /[\u064B-\u0652\u0670]/;
/** relatedWord باید نرمالِ خالص باشد: فقط حروف الفبای فارسی، بدون فاصله/ZWNJ. */
const NORMAL_WORD_RE = /^[آءابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]{2,12}$/;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** آمار برای گزارش CLI */
  counts: Record<string, number>;
  total: number;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.trim() === v;
}

/** سقف روزِ هر ماه شمسی (اسفند ۳۰ برای پوشش کبیسه). */
function maxDayOfShamsiMonth(month: number): number {
  if (month <= 6) return 31;
  return 30;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   داده‌ی JSON بیرونی است؛ اعتبارسنج باید هر شکلی را بدون کرش بررسی کند. */
type UnknownCard = Record<string, any>;

function validateOne(card: UnknownCard, index: number, errors: string[]): void {
  const at = `card[${index}]${typeof card.id === 'string' ? ` (${card.id})` : ''}`;

  // id و kind
  if (!isNonEmptyString(card.id) || !ID_RE.test(card.id)) {
    errors.push(`${at}: id نامعتبر — الگوی مجاز: prv|poe|fct|occ-NNN`);
  }
  if (!KINDS.includes(card.kind)) {
    errors.push(`${at}: kind نامعتبر «${String(card.kind)}»`);
  } else if (isNonEmptyString(card.id) && !card.id.startsWith(ID_PREFIX[card.kind as KnownKind])) {
    errors.push(`${at}: پیشوند id با kind هم‌خوان نیست`);
  }

  // فیلدهای متنی اجباری
  for (const field of ['title', 'body', 'source', 'shareCaption'] as const) {
    if (!isNonEmptyString(card[field])) {
      errors.push(`${at}: فیلد اجباری «${field}» خالی یا نامعتبر است`);
    }
  }

  // سقف طول‌ها
  if (typeof card.shareCaption === 'string' && card.shareCaption.length > SHARE_CAPTION_MAX) {
    errors.push(`${at}: shareCaption بیش از ${SHARE_CAPTION_MAX} نویسه (${card.shareCaption.length})`);
  }
  if (card.explanation !== undefined) {
    if (!isNonEmptyString(card.explanation)) {
      errors.push(`${at}: explanation اگر هست نباید خالی باشد`);
    } else if (card.explanation.length > EXPLANATION_MAX) {
      errors.push(`${at}: explanation بیش از ${EXPLANATION_MAX} نویسه (${card.explanation.length})`);
    }
  }

  // occasionDate — فقط و حتماً برای مناسبت‌ها
  if (card.kind === 'occasion') {
    if (!isNonEmptyString(card.occasionDate) || !OCCASION_DATE_RE.test(card.occasionDate)) {
      errors.push(`${at}: مناسبت باید occasionDate شمسی 'MM-DD' معتبر داشته باشد`);
    } else {
      const [mm, dd] = card.occasionDate.split('-').map(Number) as [number, number];
      if (dd > maxDayOfShamsiMonth(mm)) {
        errors.push(`${at}: روز ${dd} برای ماه شمسی ${mm} نامعتبر است`);
      }
    }
  } else if (card.occasionDate !== undefined) {
    errors.push(`${at}: occasionDate فقط برای kind='occasion' مجاز است`);
  }

  // relatedWord — باید از قبل نرمال باشد
  if (card.relatedWord !== undefined && !NORMAL_WORD_RE.test(String(card.relatedWord))) {
    errors.push(`${at}: relatedWord نرمال نیست (فقط حروف فارسی، بدون فاصله/ZWNJ/اعراب)`);
  }

  // نگارش فارسی معیار در همه‌ی فیلدهای متنی
  for (const field of ['title', 'body', 'explanation', 'source', 'shareCaption'] as const) {
    const v = card[field];
    if (typeof v !== 'string') continue;
    if (FORBIDDEN_ARABIC_RE.test(v)) {
      errors.push(`${at}: فیلد «${field}» حرف عربی غیرمجاز دارد (ي، ك یا ة)`);
    }
    if ((field === 'title' || field === 'source') && DIACRITICS_RE.test(v)) {
      errors.push(`${at}: فیلد «${field}» اعراب غیرضروری دارد`);
    }
  }
}

/**
 * اعتبارسنجی کل مجموعه. minCount را CI نهایی روی MIN_CARDS_TARGET می‌گذارد.
 */
export function validateCards(cards: unknown, minCount = 0): ValidationResult {
  const errors: string[] = [];
  const counts: Record<string, number> = { proverb: 0, poem: 0, fact: 0, occasion: 0 };

  if (!Array.isArray(cards)) {
    return { ok: false, errors: ['data/cards.json باید آرایه‌ی JSON باشد'], counts, total: 0 };
  }

  const seenIds = new Set<string>();
  const seenBodies = new Set<string>();

  cards.forEach((card: UnknownCard, i: number) => {
    if (card === null || typeof card !== 'object' || Array.isArray(card)) {
      errors.push(`card[${i}]: باید شیء JSON باشد`);
      return;
    }
    validateOne(card, i, errors);

    if (typeof card.id === 'string') {
      if (seenIds.has(card.id)) errors.push(`card[${i}]: id تکراری «${card.id}»`);
      seenIds.add(card.id);
    }
    if (typeof card.body === 'string') {
      const key = `${String(card.kind)}::${card.body.trim()}`;
      if (seenBodies.has(key)) errors.push(`card[${i}] (${String(card.id)}): body تکراری در همان kind`);
      seenBodies.add(key);
    }
    if (typeof card.kind === 'string' && card.kind in counts) {
      counts[card.kind] = (counts[card.kind] ?? 0) + 1;
    }
  });

  if (cards.length < minCount) {
    errors.push(`تعداد کارت‌ها ${cards.length} است؛ حداقل لازم: ${minCount}`);
  }

  return { ok: errors.length === 0, errors, counts, total: cards.length };
}
