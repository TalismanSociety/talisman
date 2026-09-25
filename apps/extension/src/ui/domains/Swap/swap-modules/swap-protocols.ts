// Provider registry — the single place that enumerates swap providers and their exchange types.
// Uses dynamic import types to avoid circular dependencies with provider modules.

type SimpleswapExchange = import("./simpleswap-swap-module").SimpleswapExchange
type StealthexExchange = import("./stealthex-swap-module").StealthexExchange
type ForevermoneyExchange = import("./forevermoney-swap-module").ForevermoneyExchange
type QuoteFee = import("./common.swap-module").QuoteFee

export type SupportedSwapProtocol =
  | "simpleswap"
  | "stealthex"
  | "lifi"
  | "bittensor-evm"
  | "forevermoney"

/** `fees` are the fees re-read at exchange time, they replace the quote's on the confirm screen */
export type SwapExchange = { fees?: QuoteFee[] } & (
  | { protocol: "simpleswap"; data: SimpleswapExchange }
  | { protocol: "stealthex"; data: StealthexExchange }
  | { protocol: "forevermoney"; data: ForevermoneyExchange }
)
