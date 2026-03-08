export type Loadable<T> =
  | { state: "loading" }
  | { state: "hasData"; data: T }
  | { state: "hasError"; error: unknown }

export type { SwapView } from "./swap-modules/common.swap-module"

export type QuoteSorting = "decentalised" | "cheapest" | "fastest" | "bestRate"
