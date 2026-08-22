/**
 * @dordaneh/ui-kit — دیزاین‌سیستم دُردانه (مالک: AI-04)
 * ۱۰ کامپوننت قرارداد §4 + توکن‌های CSS. RTL-first، دو تم، کوررنگی، reduced-motion.
 *
 * مصرف‌کننده باید CSSها را import کند:
 *   import '@dordaneh/ui-kit/src/tokens.css';
 *   import '@dordaneh/ui-kit/src/ui-kit.css';
 */

export { Button, type ButtonProps, type ButtonVariant } from './components/Button';
export { Tile, type TileProps } from './components/Tile';
export { Modal, type ModalProps, type ModalVariant } from './components/Modal';
export { Card, type CardProps, type CardVariant } from './components/Card';
export { Toast, type ToastProps, type ToastVariant } from './components/Toast';
export { Switch, type SwitchProps, type SwitchVariant } from './components/Switch';
export { TopBar, type TopBarProps, type TopBarVariant } from './components/TopBar';
export {
  BottomNav,
  type BottomNavProps,
  type BottomNavItem,
  type BottomNavVariant,
} from './components/BottomNav';
export {
  ProgressRing,
  type ProgressRingProps,
  type ProgressRingVariant,
} from './components/ProgressRing';
export { Confetti, type ConfettiProps, type ConfettiVariant } from './components/Confetti';
