// Provider registry — the single place that enumerates swap providers and their exchange types.
// Uses dynamic import types to avoid circular dependencies with provider modules.

type SimpleswapExchange = import("./simpleswap-swap-module").SimpleswapExchange
type StealthexExchange = import("./stealthex-swap-module").StealthexExchange
type ForevermoneyExchange = import("./forevermoney-swap-module").ForevermoneyExchange

export type SupportedSwapProtocol =
  | "simpleswap"
  | "stealthex"
  | "lifi"
  | "bittensor-evm"
  | "forevermoney"

export type SwapExchange =
  | { protocol: "simpleswap"; data: SimpleswapExchange }
  | { protocol: "stealthex"; data: StealthexExchange }
  | { protocol: "forevermoney"; data: ForevermoneyExchange }
