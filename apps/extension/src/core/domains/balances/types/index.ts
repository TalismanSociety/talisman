import "@talismn/balances-substrate-native"
import "@talismn/balances-substrate-orml"
import "@talismn/balances-evm-native"
import "@talismn/balances-evm-erc20"

import { ChainId } from "@core/domains/chains/types"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { TokenId } from "@core/domains/tokens/types"
import { Address, AddressesByChain } from "@core/types/base"
import { BalanceJson, BalanceJsonList } from "@talismn/balances"

export { Balances, Balance, BalanceFormatter } from "@talismn/balances"
export type BalanceStorage = BalanceJson
export type BalancesStorage = BalanceJsonList

export type BalancesUpdate = BalancesUpdateReset | BalancesUpdateUpsert | BalancesUpdateDelete
export type BalancesUpdateReset = { type: "reset"; balances: BalancesStorage }
export type BalancesUpdateUpsert = { type: "upsert"; balances: BalancesStorage }
export type BalancesUpdateDelete = { type: "delete"; balances: string[] }

export interface RequestBalance {
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId
  address: Address
}

export type AddressesByEvmNetwork = {
  evmNetworks: Array<Pick<EvmNetwork, "id" | "nativeToken">>
  addresses: string[]
}
export interface RequestBalancesByParamsSubscribe {
  addressesByChain: AddressesByChain
  addressesByEvmNetwork: AddressesByEvmNetwork
}

export type BalanceLockType = "democracy" | "staking" | "vesting" | "dapp-staking" | "other"
export type LockedBalance = {
  type: BalanceLockType
  amount: string //planck
}

export type RequestBalanceLocks = {
  chainId: ChainId
  addresses: Address[]
}

export type ResponseBalanceLocks = Record<Address, LockedBalance[]>

export interface BalancesMessages {
  // balance message signatures
  "pri(balances.get)": [RequestBalance, BalanceJson]
  "pri(balances.locks.get)": [RequestBalanceLocks, ResponseBalanceLocks]
  "pri(balances.subscribe)": [null, boolean, boolean]
  "pri(balances.byparams.subscribe)": [RequestBalancesByParamsSubscribe, boolean, BalancesUpdate]
}
