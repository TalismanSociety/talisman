import type { SimpleswapExchange } from "./simpleswap-swap-module"
import type { StealthexExchange } from "./stealthex-swap-module"

export type SwapExchange =
  | { protocol: "simpleswap"; data: SimpleswapExchange }
  | { protocol: "stealthex"; data: StealthexExchange }
