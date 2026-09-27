import type { NetworkList, TokenList } from "@talismn/chaindata-provider"
import type { TokenRatesList } from "@talismn/token-rates"
import type { NonFunctionProperties } from "@talismn/util"
import type { Balance } from "../classes/Balance"
import type { BalanceJson, IBalance } from "./balancetypes"

export type NarrowBalanceType<S extends IBalance, P> = S extends { source: P } ? S : never
export type BalanceSource = BalanceJson["source"]

/** TODO: Remove this in favour of a frontend-friendly `ChaindataProvider` */
export type HydrateDb = Partial<{
  networks: NetworkList
  tokens: TokenList
  tokenRates: TokenRatesList
}>

export type BalanceSearchQuery =
  | Partial<NonFunctionProperties<Balance>>
  | ((balance: Balance) => boolean)
