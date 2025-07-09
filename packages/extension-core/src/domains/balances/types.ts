import { BalancesResult, IBalance } from "@talismn/balances"
import { DotNetworkId, EthNetwork, TokenId } from "@talismn/chaindata-provider"
import { TokenRateCurrency } from "@talismn/token-rates"

import { Address } from "../../types/base"

export { Balance, BalanceFormatter, Balances, filterMirrorTokens } from "@talismn/balances"
export type { BalanceJson, BalanceJsonList } from "@talismn/balances"

export type BalanceLoadingStatus = "initialising" | "loading" | "cached" | "live"

export interface RequestBalance {
  tokenId: TokenId
  address: Address
}

export type BalanceSubscriptionResponse = BalancesResult

export type AddressesAndEvmNetworks = {
  addresses: string[]
  evmNetworks: Array<Pick<EthNetwork, "id" | "nativeTokenId">>
}
export type AddressesAndTokens = {
  addresses: string[]
  tokenIds: TokenId[]
}
export interface RequestBalancesByParamsSubscribe {
  addressesAndTokens: AddressesAndTokens
}

export type NomPoolStakedBalance = {
  lastRecordedRewardCounter: string
  points: string
  poolId: string
  unbondingEras: unknown
}

export type RequestNomPoolStake = {
  chainId?: DotNetworkId
  addresses: Address[]
}

export type ResponseNomPoolStake = Record<Address, NomPoolStakedBalance | null>

export type BalanceTotal = {
  address: Address
  total: number
  currency: TokenRateCurrency
}

export interface BalancesMessages {
  // balance message signatures
  "pri(balances.get)": [RequestBalance, IBalance | null]
  "pri(balances.subscribe)": [null, boolean, BalanceSubscriptionResponse]
  "pri(balances.byparams.subscribe)": [
    RequestBalancesByParamsSubscribe,
    boolean,
    BalanceSubscriptionResponse,
  ]
}
