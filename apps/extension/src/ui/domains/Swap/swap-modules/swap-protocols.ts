// Provider registry — the single place that enumerates swap providers and their exchange types.
// Uses dynamic import types to avoid circular dependencies with provider modules.

type SimpleswapExchange = import("./simpleswap-swap-module").SimpleswapExchange
type StealthexExchange = import("./stealthex-swap-module").StealthexExchange

export type SupportedSwapProtocol = "simpleswap" | "stealthex" | "lifi"

export type SwapExchange =
  | { protocol: "simpleswap"; data: SimpleswapExchange }
  | { protocol: "stealthex"; data: StealthexExchange }
