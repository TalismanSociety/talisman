import { BalanceJson, BalanceJsonList } from "@talismn/balances"
import { ChainId, EvmNetwork, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { TokenRateCurrency } from "@talismn/token-rates"

import { Address, AddressesByChain } from "../../types/base"

export { Balances, Balance, BalanceFormatter, filterMirrorTokens } from "@talismn/balances"
export type { BalanceJson, BalanceJsonList } from "@talismn/balances"

export type BalancesUpdate = BalancesUpdateReset | BalancesUpdateUpsert | BalancesUpdateDelete
export type BalancesUpdateReset = { type: "reset"; balances: BalanceJsonList }
export type BalancesUpdateUpsert = { type: "upsert"; balances: BalanceJsonList }
export type BalancesUpdateDelete = { type: "delete"; balances: string[] }

export interface RequestBalance {
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId
  address: Address
}

export type AddressesAndEvmNetwork = {
  addresses: string[]
  evmNetworks: Array<Pick<EvmNetwork, "id" | "nativeToken">>
}
export type AddressesAndTokens = {
  addresses: string[]
  tokenIds: TokenId[]
}
export interface RequestBalancesByParamsSubscribe {
  addressesByChain: AddressesByChain
  addressesAndEvmNetworks: AddressesAndEvmNetwork
  addressesAndTokens: AddressesAndTokens
}

export type NomPoolStakedBalance = {
  lastRecordedRewardCounter: string
  points: string
  poolId: string
  unbondingEras: unknown
}

export type RequestNomPoolStake = {
  chainId?: ChainId
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
  "pri(balances.subscribe)": [null, boolean, boolean]
  "pri(balances.byparams.subscribe)": [RequestBalancesByParamsSubscribe, boolean, BalancesUpdate]
}
