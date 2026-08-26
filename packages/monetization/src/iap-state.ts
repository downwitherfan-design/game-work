/**
 * مدیریت وضعیت پایدار مونتیزیشن روی StorageApi — کلید رزروشده: `dor.iap`.
 * fail-soft: داده‌ی خراب هرگز اپ آفلاین-اول را نمی‌شکند.
 */

import type { Sku, StorageApi } from '@dordaneh/contracts';
import { STORAGE_KEYS } from '@dordaneh/contracts';
import type { IapState, PurchaseReceipt } from './types';

const ALL_SKUS: readonly Sku[] = [
  'golden',
  'pack_cooking',
  'pack_cinema',
  'pack_sport',
  'pack_classic',
  'theme_pack_1',
];

export function isKnownSku(v: unknown): v is Sku {
  return typeof v === 'string' && (ALL_SKUS as readonly string[]).includes(v);
}

export function emptyIapState(): IapState {
  return { owned: [], receipts: [], ads: { date: '', count: 0 } };
}

/** خواندن ایمن وضعیت — هر شکل نامعتبر → حالت خالی (بدون exception). */
export function readIapState(storage: StorageApi): IapState {
  const raw = storage.get<unknown>(STORAGE_KEYS.iap);
  if (raw === null || typeof raw !== 'object') return emptyIapState();
  const r = raw as Partial<IapState>;
  const owned = Array.isArray(r.owned) ? r.owned.filter(isKnownSku) : [];
  const receipts = Array.isArray(r.receipts)
    ? r.receipts.filter(
        (x): x is PurchaseReceipt =>
          typeof x === 'object' && x !== null && isKnownSku((x as PurchaseReceipt).sku),
      )
    : [];
  const ads =
    r.ads && typeof r.ads === 'object' && typeof r.ads.date === 'string'
      ? { date: r.ads.date, count: Number(r.ads.count) || 0 }
      : { date: '', count: 0 };
  const offer =
    r.offer && typeof r.offer === 'object' && typeof r.offer.lastShownAt === 'number'
      ? { lastShownAt: r.offer.lastShownAt, count: Number(r.offer.count) || 0 }
      : undefined;
  return offer ? { owned, receipts, ads, offer } : { owned, receipts, ads };
}

export function writeIapState(storage: StorageApi, state: IapState): void {
  storage.set(STORAGE_KEYS.iap, state);
}

/** افزودن مالکیت + رسید (idempotent). */
export function grantSku(storage: StorageApi, receipt: PurchaseReceipt): IapState {
  const state = readIapState(storage);
  if (!state.owned.includes(receipt.sku)) state.owned.push(receipt.sku);
  const dup = state.receipts.some(
    (x) => x.sku === receipt.sku && x.purchaseToken === receipt.purchaseToken,
  );
  if (!dup) state.receipts.push(receipt);
  writeIapState(storage, state);
  return state;
}

/**
 * صحت‌سنجی رسید — متد آماده برای فراخوانی سرور بازار/مایکت.
 * MVP آفلاین-اول: خرید خوش‌بینانه اعمال شده؛ این متد بعداً توسط app-shell
 * با endpoint واقعی (`POST /iap/verify` — پس از RFC بک‌اند) صدا زده می‌شود.
 * silent-degrade: خطای شبکه هرگز مالکیت کاربر را پس نمی‌گیرد.
 */
export async function verifyReceipt(
  storage: StorageApi,
  receipt: PurchaseReceipt,
  verifier?: (r: PurchaseReceipt) => Promise<boolean>,
): Promise<boolean> {
  if (!verifier) return receipt.verified;
  try {
    const ok = await verifier(receipt);
    if (ok) {
      const state = readIapState(storage);
      const found = state.receipts.find(
        (x) => x.sku === receipt.sku && x.purchaseToken === receipt.purchaseToken,
      );
      if (found) {
        found.verified = true;
        writeIapState(storage, state);
      }
    }
    return ok;
  } catch {
    // آفلاین/خطای سرور → وضعیت فعلی حفظ می‌شود (کاربر مجازات نمی‌شود)
    return receipt.verified;
  }
}
