import { Token } from "./Token"

/**
 * A selection of fields which can be set as part of the `BalancesConfig` section on chaindata for any module type.
 *
 * Generally speaking, these fields will override any defaults set by the module itself.
 *
 * E.g. if the module determines a native token to have the symbol `IBTC`, but we want to show it
 * as `iBTC`, we can set the `symbol` field in chaindata at: `chains.interlay.balancesConfig.substrate-native.symbol`.
 */
export type BalancesConfigTokenParams = Pick<
  Partial<Token>,
  | "symbol"
  | "coingeckoId"
  | "mirrorOf"
  | "logo"
  | "isDefault"
  | "noDiscovery"
  | "name"
  | "decimals"
  | "symbol"
>
