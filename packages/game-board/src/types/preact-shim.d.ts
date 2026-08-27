/**
 * Type-shim موقت Preact — طبق RFC-0001 (docs/rfcs/RFC-0001-dep-preact.md).
 * تا زمانی که AI-14 وابستگی pin شده‌ی preact@10.24.3 را به lock اضافه کند،
 * این اعلان‌ها tsc را بدون نصب پکیج سبز نگه می‌دارند (01_RED_LINES بند ۲:
 * آداپتور موقت). پس از تأیید RFC این فایل حذف می‌شود — تایپ‌های رسمی preact
 * جایگزین کاملاً سازگار هستند (زیرمجموعه‌ی همین API).
 */

declare module 'preact' {
  export interface VNode<P = Record<string, unknown>> {
    type: string | ComponentType<P>;
    props: P & { children?: ComponentChildren };
    key?: string | number | null;
  }

  export type ComponentChild =
    | VNode<Record<string, unknown>>
    | string
    | number
    | boolean
    | null
    | undefined;
  export type ComponentChildren = ComponentChild | ComponentChild[];

  export type FunctionComponent<P = Record<string, never>> = (
    props: P & { children?: ComponentChildren },
  ) => VNode<Record<string, unknown>> | null;
  export type ComponentType<P = Record<string, never>> = FunctionComponent<P>;

  export function h(
    type: string | ComponentType<Record<string, unknown>>,
    props: Record<string, unknown> | null,
    ...children: ComponentChild[]
  ): VNode<Record<string, unknown>>;

  export function render(
    vnode: VNode<Record<string, unknown>> | null,
    parent: Element | Document | ShadowRoot | DocumentFragment,
  ): void;

  export function Fragment(props: { children?: ComponentChildren }): VNode<
    Record<string, unknown>
  > | null;
}

declare module 'preact/hooks' {
  import type { ComponentChildren } from 'preact';

  export type StateUpdater<S> = S | ((prev: S) => S);
  export function useState<S>(initial: S | (() => S)): [S, (value: StateUpdater<S>) => void];
  export function useEffect(cb: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: never[]) => unknown>(
    cb: T,
    deps: readonly unknown[],
  ): T;
  export function useRef<T>(initial: T): { current: T };
  export function useRef<T = undefined>(): { current: T | undefined };
  // برای جلوگیری از خطای «declared but never used» در لینت
  export type _Children = ComponentChildren;
}

declare module 'preact/jsx-runtime' {
  import type { ComponentChildren, ComponentType, VNode } from 'preact';

  export function jsx(
    type: string | ComponentType<Record<string, unknown>>,
    props: Record<string, unknown>,
    key?: string | number,
  ): VNode<Record<string, unknown>>;
  export const jsxs: typeof jsx;
  export const jsxDEV: typeof jsx;
  export function Fragment(props: { children?: ComponentChildren }): VNode<
    Record<string, unknown>
  > | null;

  export namespace JSX {
    /** در shim موقت، همه‌ی اتریبیوت‌ها آزادند؛ تایپ رسمی preact بعداً سخت‌گیرتر می‌شود */
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
    type Element = VNode<Record<string, unknown>>;
    interface ElementChildrenAttribute {
      children: unknown;
    }
    interface IntrinsicAttributes {
      key?: string | number;
    }
  }
}
