/** تست‌های واحد ۱۰ کامپوننت قرارداد — رندر vnode بدون DOM. */
import { describe, it, expect, vi } from 'vitest';
import {
  Button,
  Tile,
  Modal,
  Card,
  Toast,
  Switch,
  TopBar,
  BottomNav,
  ProgressRing,
  Confetti,
} from '../src/index';
import { renderRoot, renderTree, findAll, textOf, classesOf } from './helpers/render';

describe('Button', () => {
  it('واریانت‌ها را به کلاس تبدیل می‌کند', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'gold'] as const) {
      const n = renderRoot(<Button variant={variant}>ثبت</Button>);
      expect(n.tag).toBe('button');
      expect(classesOf(n)).toContain(`dor-btn--${variant}`);
    }
  });
  it('پیش‌فرض primary و type=button است', () => {
    const n = renderRoot(<Button>باشه</Button>);
    expect(classesOf(n)).toContain('dor-btn--primary');
    expect(n.props['type']).toBe('button');
    expect(textOf(n)).toBe('باشه');
  });
  it('breath کلاس میکرو-انیمیشن CTA را می‌گیرد', () => {
    const n = renderRoot(<Button breath>شروع</Button>);
    expect(classesOf(n)).toContain('dor-btn--breath');
  });
  it('disabled و ariaLabel پاس می‌شوند', () => {
    const n = renderRoot(<Button disabled ariaLabel="بستن" />);
    expect(n.props['disabled']).toBe(true);
    expect(n.props['aria-label']).toBe('بستن');
  });
});

describe('Tile', () => {
  it('هر ۵ state قرارداد LetterState را می‌پذیرد', () => {
    for (const s of ['empty', 'tbd', 'correct', 'present', 'absent'] as const) {
      const n = renderRoot(<Tile letter="د" variant={s} />);
      expect(classesOf(n)).toContain(`dor-tile--${s}`);
      expect(n.props['data-state']).toBe(s);
    }
  });
  it('تأخیر پلکانی flip را به متغیر CSS می‌برد (stagger 250ms)', () => {
    const n = renderRoot(<Tile letter="ر" variant="correct" flipDelayMs={500} />);
    const style = n.props['style'] as Record<string, string>;
    expect(style['--dor-flip-delay']).toBe('500ms');
  });
  it('الگوی شکل کوررنگی: ● برای correct و ─ برای present', () => {
    const c = renderRoot(<Tile letter="د" variant="correct" />);
    expect(findAll(c, (x) => classesOf(x).includes('dor-tile__cbmark')).length).toBe(1);
    expect(textOf(c)).toContain('●');
    const p = renderRoot(<Tile letter="د" variant="present" />);
    expect(textOf(p)).toContain('─');
    const a = renderRoot(<Tile letter="د" variant="absent" />);
    expect(findAll(a, (x) => classesOf(x).includes('dor-tile__cbmark')).length).toBe(0);
  });
  it('برچسب دسترس‌پذیری فارسی state دارد', () => {
    const n = renderRoot(<Tile letter="د" variant="correct" />);
    expect(String(n.props['aria-label'])).toContain('درست');
  });
  it('دو وجه flip (front/back) دارد', () => {
    const n = renderRoot(<Tile letter="د" variant="present" />);
    expect(findAll(n, (x) => classesOf(x).includes('dor-tile__face--front')).length).toBe(1);
    expect(findAll(n, (x) => classesOf(x).includes('dor-tile__face--back')).length).toBe(1);
  });
});

describe('Modal', () => {
  it('وقتی open=false هیچ‌چیز رندر نمی‌کند', () => {
    expect(renderTree(<Modal open={false} title="x" />)).toEqual([]);
  });
  it('نقش dialog و عنوان دارد', () => {
    const n = renderRoot(
      <Modal open title="آمار">
        محتوا
      </Modal>,
    );
    const dialog = findAll(n, (x) => x.props['role'] === 'dialog');
    expect(dialog.length).toBe(1);
    expect(textOf(n)).toContain('آمار');
    expect(textOf(n)).toContain('محتوا');
  });
  it('با onClose دکمه‌ی بستن با برچسب فارسی دارد', () => {
    const n = renderRoot(<Modal open title="x" onClose={() => {}} />);
    const close = findAll(n, (x) => classesOf(x).includes('dor-modal__close'));
    expect(close.length).toBe(1);
    expect(close[0]?.props['aria-label']).toBe('بستن');
  });
});

describe('Card', () => {
  it('سه واریانت کمیابی + روبان فارسی', () => {
    const map = { common: 'معمولی', rare: 'کمیاب', legendary: 'دُردانه' } as const;
    for (const variant of ['common', 'rare', 'legendary'] as const) {
      const n = renderRoot(<Card variant={variant} title="ضرب‌المثل روز" body="متن" />);
      expect(classesOf(n)).toContain(`dor-card--${variant}`);
      expect(textOf(n)).toContain(map[variant]);
    }
  });
  it('منبع مستند را با پیشوند فارسی نشان می‌دهد', () => {
    const n = renderRoot(<Card body="مثل" source="امثال و حکم دهخدا" />);
    expect(textOf(n)).toContain('منبع: امثال و حکم دهخدا');
  });
  it('عنصر معنایی article است', () => {
    expect(renderRoot(<Card body="x" />).tag).toBe('article');
  });
});

describe('Toast', () => {
  it('واریانت‌های success/error و نقش status', () => {
    const n = renderRoot(<Toast message="آفرین! زدی وسط خال 🎯" variant="success" />);
    expect(classesOf(n)).toContain('dor-toast--success');
    expect(n.props['role']).toBe('status');
    expect(n.props['aria-live']).toBe('polite');
    expect(textOf(n)).toContain('آفرین');
  });
  it('open=false → هیچ رندری', () => {
    expect(renderTree(<Toast message="x" open={false} />)).toEqual([]);
  });
});

describe('Switch', () => {
  it('checkbox با role=switch و برچسب', () => {
    const n = renderRoot(<Switch checked label="تم تیره" />);
    const input = findAll(n, (x) => x.tag === 'input');
    expect(input[0]?.props['role']).toBe('switch');
    expect(input[0]?.props['checked']).toBe(true);
    expect(input[0]?.props['aria-label']).toBe('تم تیره');
  });
  it('track و thumb بصری دارد', () => {
    const n = renderRoot(<Switch checked={false} />);
    expect(findAll(n, (x) => classesOf(x).includes('dor-switch__track')).length).toBe(1);
    expect(findAll(n, (x) => classesOf(x).includes('dor-switch__thumb')).length).toBe(1);
  });
});

describe('TopBar', () => {
  it('header معنایی با عنوان h1 و دو اسلات', () => {
    const n = renderRoot(<TopBar title="دُردانه" start={<span>س</span>} end={<span>پ</span>} />);
    expect(n.tag).toBe('header');
    const h1 = findAll(n, (x) => x.tag === 'h1');
    expect(h1.length).toBe(1);
    expect(textOf(h1[0]!)).toBe('دُردانه');
    expect(findAll(n, (x) => classesOf(x).includes('dor-topbar__side')).length).toBe(2);
  });
});

describe('BottomNav', () => {
  const items = [
    { id: 'daily', label: 'روزانه', icon: '🎯' },
    { id: 'stats', label: 'آمار', icon: '📊' },
    { id: 'album', label: 'گنجینه', icon: '💎' },
  ];
  it('همه‌ی آیتم‌ها را با آیکون/برچسب رندر می‌کند', () => {
    const n = renderRoot(<BottomNav items={items} activeId="stats" />);
    expect(n.tag).toBe('nav');
    const btns = findAll(n, (x) => x.tag === 'button');
    expect(btns.length).toBe(3);
    expect(textOf(n)).toContain('گنجینه');
  });
  it('آیتم فعال aria-current=page می‌گیرد', () => {
    const n = renderRoot(<BottomNav items={items} activeId="stats" />);
    const active = findAll(n, (x) => x.props['aria-current'] === 'page');
    expect(active.length).toBe(1);
    expect(textOf(active[0]!)).toContain('آمار');
  });
});

describe('ProgressRing', () => {
  it('نقش progressbar با aria-valuenow', () => {
    const n = renderRoot(<ProgressRing value={0.6} />);
    expect(n.props['role']).toBe('progressbar');
    expect(n.props['aria-valuenow']).toBe(60);
  });
  it('درصد را با اعداد فارسی نشان می‌دهد (خط قرمز ۳۱)', () => {
    const n = renderRoot(<ProgressRing value={0.42} />);
    expect(textOf(n)).toContain('۴۲');
  });
  it('مقدار خارج از بازه clamp می‌شود', () => {
    expect(renderRoot(<ProgressRing value={2} />).props['aria-valuenow']).toBe(100);
    expect(renderRoot(<ProgressRing value={-1} />).props['aria-valuenow']).toBe(0);
  });
  it('واریانت gold کلاس طلایی می‌گیرد', () => {
    const n = renderRoot(<ProgressRing value={1} variant="gold" />);
    expect(classesOf(n)).toContain('dor-progressring--gold');
  });
  it('stroke-dashoffset متناسب با مقدار است', () => {
    const n = renderRoot(<ProgressRing value={0} size={64} strokeWidth={6} />);
    const bar = findAll(n, (x) => classesOf(x).includes('dor-progressring__bar'))[0]!;
    const c = 2 * Math.PI * ((64 - 6) / 2);
    expect(Number(bar.props['stroke-dashoffset'])).toBeCloseTo(c, 3);
  });
});

describe('Confetti', () => {
  it('canvas با کلاس dor-confetti و aria-hidden رندر می‌کند', () => {
    const n = renderRoot(<Confetti active={false} />);
    expect(n.tag).toBe('canvas');
    expect(classesOf(n)).toContain('dor-confetti');
    expect(n.props['aria-hidden']).toBe('true');
  });
  it('با prefers-reduced-motion بدون ذره onDone را صدا می‌زند', () => {
    const inst = new Confetti({ active: true, onDone: vi.fn() });
    // شبیه‌سازی محیط: matchMedia = reduce, canvas موجود
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    (inst as unknown as { canvas: unknown }).canvas = { getContext: () => null };
    (inst as unknown as { start(): void }).start();
    expect(inst.props.onDone).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
