/**
 * Mockهای قراردادی سرویس‌های غیر-UI:
 * CultureApi (AI-03)، AudioApi (AI-13)، AnalyticsApi (AI-12)،
 * MonetizationApi (AI-11)، ShareApi (AI-07).
 * همه دقیقاً مطابق docs/02_CONTRACTS.md — تا آماده‌شدن پکیج واقعی.
 */
import {
  STORAGE_KEYS,
  toPersianDigits,
  type AnalyticsApi,
  type AppEvent,
  type AudioApi,
  type CultureApi,
  type CultureCard,
  type MonetizationApi,
  type PuzzleState,
  type ShareApi,
  type Sku,
  type StorageApi,
} from '@dordaneh/contracts';

// ---------------------------------------------------------------------------
// CultureApi mock — چند کارت مستند و امن خانوادگی (داده‌ی نمونه، نه متن UI)
// ---------------------------------------------------------------------------

const MOCK_CARDS: CultureCard[] = [
  {
    id: 'mock-proverb-1',
    kind: 'proverb',
    title: 'ضرب‌المثل روز',
    body: 'جوینده یابنده است.',
    explanation: 'هر که تلاش کند، سرانجام به خواسته‌اش می‌رسد.',
    source: 'امثال و حکم، علی‌اکبر دهخدا',
    shareCaption: 'امروز در دُردانه یاد گرفتم: جوینده یابنده است ✨',
  },
  {
    id: 'mock-poem-1',
    kind: 'poem',
    title: 'بیت روز',
    body: 'توانا بود هر که دانا بود / ز دانش دل پیر برنا بود',
    explanation: 'دانش، سرچشمه‌ی توانایی است.',
    source: 'شاهنامه، فردوسی — آغاز کتاب',
    shareCaption: 'توانا بود هر که دانا بود 📖 — از گنجینه‌ی دُردانه',
  },
  {
    id: 'mock-fact-1',
    kind: 'fact',
    title: 'دانستنی روز',
    body: 'واژه‌ی «دُردانه» یعنی دانه‌ی مروارید؛ کنایه از فرزند یا چیز بسیار عزیز.',
    explanation: 'دُر به معنی مروارید است و دانه‌ی آن، گران‌بهاترین بخش صدف.',
    source: 'لغت‌نامه‌ی دهخدا، مدخل «دردانه»',
    relatedWord: 'دردانه',
    shareCaption: 'می‌دونستی «دُردانه» یعنی دانه‌ی مروارید؟ 🦪 — دُردانه',
  },
];

export function createMockCulture(storage: StorageApi): CultureApi {
  return {
    getCardForPuzzle(puzzleNumber: number, _solutionWord: string): CultureCard {
      const idx = ((puzzleNumber % MOCK_CARDS.length) + MOCK_CARDS.length) % MOCK_CARDS.length;
      return MOCK_CARDS[idx] as CultureCard;
    },
    getAlbum() {
      const discovered = storage.get<string[]>(STORAGE_KEYS.album) ?? [];
      const cards = MOCK_CARDS.filter((c) => discovered.includes(c.id));
      return { total: MOCK_CARDS.length, cards };
    },
  };
}

// ---------------------------------------------------------------------------
// AudioApi mock — بی‌صدا (پکیج واقعی: @dordaneh/audio-haptics)
// ---------------------------------------------------------------------------

export function createMockAudio(): AudioApi {
  let sfxOn = true;
  return {
    play(_name) {
      // بی‌صدا — فقط قرارداد را ارضا می‌کند
      void sfxOn;
    },
    setMusicEnabled(_on) {
      /* no-op */
    },
    setSfxEnabled(on) {
      sfxOn = on;
    },
    haptic(_kind) {
      /* no-op */
    },
  };
}

// ---------------------------------------------------------------------------
// AnalyticsApi mock — صف آفلاین در Storage (قرارداد §8)
// ---------------------------------------------------------------------------

export function createMockAnalytics(storage: StorageApi): AnalyticsApi {
  return {
    track(e: AppEvent): void {
      const queue = storage.get<AppEvent[]>(STORAGE_KEYS.analyticsQueue) ?? [];
      queue.push(e);
      // سقف صف برای جلوگیری از رشد بی‌پایان در حالت آفلاین
      storage.set(STORAGE_KEYS.analyticsQueue, queue.slice(-500));
    },
    getRemoteConfig<T>(_key: string, fallback: T): T {
      return fallback;
    },
  };
}

// ---------------------------------------------------------------------------
// MonetizationApi mock — طبق قرارداد §10: در وب/دِو همیشه rewarded/ok
// ---------------------------------------------------------------------------

export function createMockMonetization(storage: StorageApi): MonetizationApi {
  return {
    isGolden(): boolean {
      const iap = storage.get<{ owned?: Sku[] }>(STORAGE_KEYS.iap);
      return iap?.owned?.includes('golden') ?? false;
    },
    ownsSku(sku: Sku): boolean {
      const iap = storage.get<{ owned?: Sku[] }>(STORAGE_KEYS.iap);
      return iap?.owned?.includes(sku) ?? false;
    },
    showRewardedAd(_placement) {
      return Promise.resolve('rewarded' as const);
    },
    purchase(sku: Sku) {
      const iap = storage.get<{ owned?: Sku[] }>(STORAGE_KEYS.iap) ?? { owned: [] };
      const owned = iap.owned ?? [];
      if (!owned.includes(sku)) owned.push(sku);
      storage.set(STORAGE_KEYS.iap, { owned });
      return Promise.resolve('ok' as const);
    },
  };
}

// ---------------------------------------------------------------------------
// ShareApi mock — گرید بی‌اسپویلر + Web Share با فالبک کپی (قرارداد §12)
// ---------------------------------------------------------------------------

const STATE_EMOJI: Record<string, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
  empty: '⬜',
  tbd: '⬜',
};

export function buildResultGridText(state: PuzzleState): string {
  const num = /-(\d+)$/.exec(state.puzzleId)?.[1] ?? '';
  const header = `دُردانه ${num ? `#${toPersianDigits(num)}` : ''} — ${
    state.status === 'won' ? toPersianDigits(state.guesses.length) : 'X'
  }/${toPersianDigits(state.maxGuesses)}`;
  const rows = state.guesses.map((g) =>
    g.states.map((s) => STATE_EMOJI[s] ?? '⬜').join(''),
  );
  return [header.trim(), '', ...rows].join('\n');
}

async function shareText(text: string): Promise<void> {
  const nav = globalThis.navigator as
    | { share?: (d: { text: string }) => Promise<void>; clipboard?: { writeText(t: string): Promise<void> } }
    | undefined;
  try {
    if (nav?.share) {
      await nav.share({ text });
      return;
    }
    await nav?.clipboard?.writeText(text);
  } catch {
    // لغو توسط کاربر یا نبود API — silent degrade
  }
}

export function createMockShare(): ShareApi {
  return {
    buildResultGrid: buildResultGridText,
    async shareResult(state: PuzzleState): Promise<void> {
      await shareText(buildResultGridText(state));
    },
    async shareCard(card: CultureCard): Promise<void> {
      await shareText(card.shareCaption);
    },
    buildInviteLink(kind, id): string {
      return `https://dordaneh.ir/d/${kind}/${id}`;
    },
  };
}
