/**
 * آنبوردینگ «پیروزی ۳۰ ثانیه‌ای» — بدون فرم/ثبت‌نام:
 * intro یک‌کارته → معمای آسان getOnboardingPuzzle() با ۲ راهنمای درون‌بازی
 * → پیروزی → کارت فرهنگی → «فردا معمای واقعی منتظرته!».
 * مبنا: Bandura 1977 (خودکارآمدی) + Kahneman 1993 (Peak-End). خط قرمز ۱۷.
 */
import { useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { CultureCard } from '@dordaneh/contracts';
import { t } from '../core/i18n';
import { useShell } from './context';
import { MockGameScreen } from '../mocks/screens.mock';

type Stage = 'intro' | 'play' | 'win';

export function Onboarding(props: { onDone: () => void }): JSX.Element {
  const { services, orchestrator, bus } = useShell();
  const [stage, setStage] = useState<Stage>('intro');
  const [card, setCard] = useState<CultureCard | null>(null);

  const puzzle = useMemo(() => services.engine.getOnboardingPuzzle(), [services.engine]);

  function handleFinished(won: boolean): void {
    if (!won) return; // معمای آسان است؛ در باخت، بازی ادامه‌پذیر می‌ماند
    const state = services.engine.getState(puzzle.puzzleId);
    const c = services.culture.getCardForPuzzle(0, state.solution ?? '');
    setCard(c);
    bus.emit({ type: 'card_revealed', cardId: c.id });
    setStage('win');
  }

  function finish(): void {
    orchestrator.markOnboarded();
    props.onDone();
  }

  if (stage === 'intro') {
    return (
      <section id="onboarding-intro" class="dor-screen dor-onboarding">
        <h1>{t('appShell.onboarding.welcome')}</h1>
        <p>{t('appShell.onboarding.intro')}</p>
        <button id="onboarding-start" class="dor-primary" onClick={() => setStage('play')}>
          {t('appShell.onboarding.start')}
        </button>
      </section>
    );
  }

  if (stage === 'play') {
    return (
      <section id="onboarding-play" class="dor-onboarding">
        {/* ۲ راهنمای tooltip یک‌جمله‌ای درون‌بازی */}
        <aside class="dor-tooltip" id="onboarding-tip-1">{t('appShell.onboarding.tip1')}</aside>
        <aside class="dor-tooltip" id="onboarding-tip-2">{t('appShell.onboarding.tip2')}</aside>
        <MockGameScreen puzzleIdOverride={puzzle.puzzleId} onFinished={handleFinished} />
      </section>
    );
  }

  return (
    <section id="onboarding-win" class="dor-screen dor-onboarding">
      <h1>{t('appShell.onboarding.win.title')}</h1>
      <p>{t('appShell.onboarding.win.body')}</p>
      {card ? (
        <article class="dor-card" id="onboarding-card">
          <strong>{card.title}</strong>
          <p>{card.body}</p>
          <small>{card.source}</small>
        </article>
      ) : null}
      <p class="dor-peak-end">{t('appShell.onboarding.win.tomorrow')}</p>
      <button id="onboarding-done" class="dor-primary" onClick={finish}>
        {t('appShell.onboarding.win.cta')}
      </button>
    </section>
  );
}
