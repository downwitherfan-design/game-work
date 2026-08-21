/**
 * مودال نتیجه — توزیع حدس‌ها + دکمه‌ی اشتراک (رویداد share_initiated به
 * viral-share) + نمایش محترمانه‌ی جواب در باخت. کارت فرهنگی مال app-shell است.
 */

import type { EventBus } from '@dordaneh/contracts';
import { toPersianDigits } from '@dordaneh/contracts';
import type { BoardViewState } from '../logic/controller';
import { t, tFa } from '../i18n';

export interface GuessDistribution {
  /** counts[i] = تعداد بردها با i+1 حدس (از آمار محلی؛ اختیاری) */
  counts: readonly number[];
}

export interface ResultModalProps {
  s: BoardViewState;
  bus: EventBus;
  /** توزیع تاریخی حدس‌ها (اختیاری — از meta-retention از راه app-shell) */
  distribution?: GuessDistribution;
  onClose(): void;
}

export function ResultModal({ s, bus, distribution, onClose }: ResultModalProps) {
  const won = s.phase === 'won';
  const myCount = s.guesses.length;

  // توزیع: اگر آمار تاریخی نبود، فقط بازی فعلی
  const counts: number[] = Array.from({ length: s.maxGuesses }, (_, i) => {
    const hist = distribution?.counts[i] ?? 0;
    return hist + (won && i === myCount - 1 ? 1 : 0);
  });
  const maxCount = Math.max(1, ...counts);

  function share(): void {
    bus.emit({ type: 'share_initiated', surface: 'result' });
  }

  return (
    <div class="gb-modal-backdrop" onPointerDown={onClose}>
      <section
        id="result-modal"
        class="gb-modal"
        role="dialog"
        aria-modal="true"
        aria-label={won ? t('gameBoard.resultTitleWin') : t('gameBoard.resultTitleLose')}
        onPointerDown={(e: { stopPropagation(): void }) => e.stopPropagation()}
      >
        <h2>{won ? t('gameBoard.resultTitleWin') : t('gameBoard.resultTitleLose')}</h2>

        {won ? (
          <p>{tFa('gameBoard.resultGuessCount', { count: myCount })}</p>
        ) : (
          <p>
            {s.solution ? (
              <>
                {t('gameBoard.solutionWas', { word: '' })}
                <span class="gb-solution">{s.solution}</span>
                <br />
              </>
            ) : null}
            {t('gameBoard.loseToast')}
          </p>
        )}

        <div class="gb-dist" aria-label={tFa('gameBoard.guessDistribution')}>
          {counts.map((c, i) => (
            <div key={i} class="gb-dist-row">
              <span>{toPersianDigits(i + 1)}</span>
              <div
                class="gb-dist-bar"
                data-hit={won && i === myCount - 1 ? 'true' : undefined}
                style={`inline-size:${Math.round((c / maxCount) * 100)}%`}
              >
                {toPersianDigits(c)}
              </div>
            </div>
          ))}
        </div>

        <div class="gb-modal-actions">
          <button type="button" class="gb-share-btn" onPointerDown={share}>
            {t('gameBoard.share')}
          </button>
          <button type="button" class="gb-close-btn" onPointerDown={onClose}>
            {t('gameBoard.close')}
          </button>
        </div>
      </section>
    </div>
  );
}
