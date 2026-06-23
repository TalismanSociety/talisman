import type { RefObject } from "react"
import {
  useHoverDirty as useHoverDirtyBase,
  useIntersection as useIntersectionBase,
} from "react-use"

// react-use (17.6.1, last release) types its ref params as `RefObject<HTMLElement>` /
// `RefObject<Element>` — non-null. @types/react 19's `useRef(null)` now yields
// `RefObject<T | null>`, which those signatures reject. react-use has no React-19 type
// update, so these thin wrappers re-type the ref param to accept the nullable ref. Runtime
// is unchanged — react-use guards `ref.current` internally. Drop these if react-use ships
// React-19 types or is removed.

export const useIntersection = (
  ref: RefObject<HTMLElement | null>,
  options: IntersectionObserverInit
): IntersectionObserverEntry | null => useIntersectionBase(ref as RefObject<HTMLElement>, options)

export const useHoverDirty = (ref: RefObject<Element | null>, enabled?: boolean): boolean =>
  useHoverDirtyBase(ref as RefObject<Element>, enabled)
