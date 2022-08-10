import { ChainId, EvmNetworkId, MultiChainId, TokenId } from "@talismn/chaindata-provider"

import { Address } from "./addresses"

export type BalancesStorage = Record<string, BalanceStorage>

export type BalanceStatus = "live" | "cache"

export interface BalanceStorages {} // eslint-disable-line @typescript-eslint/no-empty-interface

export type ValidBalanceStorages = {
  // Check that each plugin-provided BalanceStorage is a valid BalanceStorage (i.e. has all of the IBalanceStorage fields)
  [BalanceStorage in keyof BalanceStorages]: BalanceStorages[BalanceStorage] extends IBalanceStorage
    ? // Include the valid token
      BalanceStorages[BalanceStorage]
    : // Don't include the invalid token
      never
}

export type BalanceStorage = ValidBalanceStorages[keyof ValidBalanceStorages] extends never
  ? // When no BalanceStorages provided, default to the base IBalanceStorage
    IBalanceStorage
  : ValidBalanceStorages[keyof ValidBalanceStorages]

export type IBalanceStorage = {
  /** The module that this balance was retrieved by */
  source: string

  /** Has this balance never been fetched, or is it from a cache, or is it up to date? */
  status: BalanceStatus

  /** The address of the account which owns this balance */
  address: Address
  /** The token this balance is for */
  tokenId: TokenId

  /** WIP, use `chainId` or `evmNetworkId` for now */
  multiChainId: MultiChainId
  /** The substrate chain this balance is on */
  chainId?: ChainId
  /** The evm chain this balance is on */
  evmNetworkId?: EvmNetworkId
}
