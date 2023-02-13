import { Address, AddressesByChain } from "@core/types/base"
import { BalanceJson, BalanceJsonList } from "@talismn/balances"
import { ChainId, EvmNetwork, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"

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

export type RequestNomPoolLocks = {
  chainId?: ChainId
  addresses: Address[]
}

export type ResponseBalanceLocks = Record<Address, LockedBalance[]>

export interface BalancesMessages {
  // balance message signatures
  "pri(balances.get)": [RequestBalance, BalanceJson]
  "pri(balances.locks.get)": [RequestBalanceLocks, ResponseBalanceLocks]
  "pri(balances.nompools.get)": [RequestNomPoolLocks, ResponseBalanceLocks]
  "pri(balances.subscribe)": [null, boolean, boolean]
  "pri(balances.byparams.subscribe)": [RequestBalancesByParamsSubscribe, boolean, BalancesUpdate]
}
