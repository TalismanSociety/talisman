import { BalanceJson } from "@talismn/balances"
import { DotNetworkId, EthNetwork, TokenId } from "@talismn/chaindata-provider"
import { TokenRateCurrency } from "@talismn/token-rates"

import { Address, AddressesByChain } from "../../types/base"

export { Balance, BalanceFormatter, Balances, filterMirrorTokens } from "@talismn/balances"
export type { BalanceJson, BalanceJsonList } from "@talismn/balances"

export type BalanceLoadingStatus = "initialising" | "loading" | "cached" | "live"

export interface RequestBalance {
  tokenId: TokenId
  address: Address
}

export type BalanceSubscriptionResponse = {
  data: BalanceJson[]
  status: BalanceLoadingStatus
}

export type AddressesAndEvmNetworks = {
  addresses: string[]
  evmNetworks: Array<Pick<EthNetwork, "id" | "nativeTokenId">>
}
export type AddressesAndTokens = {
  addresses: string[]
  tokenIds: TokenId[]
}
export interface RequestBalancesByParamsSubscribe {
  addressesByChain: AddressesByChain
  addressesAndEvmNetworks: AddressesAndEvmNetworks
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
  "pri(balances.get)": [RequestBalance, BalanceJson]
  "pri(balances.subscribe)": [null, boolean, BalanceSubscriptionResponse]
  "pri(balances.byparams.subscribe)": [
    RequestBalancesByParamsSubscribe,
    boolean,
    BalanceSubscriptionResponse,
  ]
}
