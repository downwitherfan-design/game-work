/**
 * ⚠️ شیم موقت تایپ‌های preact — تا تأیید RFC وابستگی preact و افزودن آن به lock
 * توسط AI-14 (docs/rfcs/RFC-0008-dep-preact.md). پس از نصب واقعی preact این فایل
 * حذف می‌شود. فقط زیرمجموعه‌ی استفاده‌شده تایپ شده — بدون any.
 */

declare module 'preact' {
  export interface VNode<P = Record<string, unknown>> {
    type: string | ComponentType<P>;
    props: P;
    key?: string | number | null;
  }
  export type ComponentChild = VNode | object | string | number | boolean | null | undefined;
  export type ComponentChildren = ComponentChild | ComponentChild[];
  export type ComponentType<P = Record<string, unknown>> = (props: P) => VNode | null;
  export type FunctionComponent<P = Record<string, unknown>> = ComponentType<P>;
  export function Fragment(props: { children?: ComponentChildren }): VNode | null;
}

declare module 'preact/hooks' {
  export function useState<S>(
    initial: S | (() => S),
  ): [S, (value: S | ((prev: S) => S)) => void];
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useCallback<T extends (...args: never[]) => unknown>(
    fn: T,
    deps: readonly unknown[],
  ): T;
}

declare module 'preact/jsx-runtime' {
  import type { ComponentChildren, ComponentType, VNode } from 'preact';
  export function jsx(
    type: string | ComponentType<Record<string, unknown>>,
    props: Record<string, unknown>,
    key?: string | number,
  ): VNode;
  export function jsxs(
    type: string | ComponentType<Record<string, unknown>>,
    props: Record<string, unknown>,
    key?: string | number,
  ): VNode;
  export function jsxDEV(
    type: string | ComponentType<Record<string, unknown>>,
    props: Record<string, unknown>,
    key?: string | number,
  ): VNode;
  export { Fragment } from 'preact';
  export namespace JSX {
    type Element = VNode;
    interface ElementChildrenAttribute {
      children: ComponentChildren;
    }
    interface IntrinsicAttributes {
      key?: string | number;
    }
    interface IntrinsicElements {
      // شیم موقت: تگ‌های HTML با پراپ‌های آزادِ type-safeِ حداقلی
      [tagName: string]: Record<string, unknown>;
    }
  }
}
