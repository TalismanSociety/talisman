import { ChainId, EvmNetworkId, MultiChainId, TokenId } from "@talismn/chaindata-provider"

import { PluginBalanceTypes } from "../plugins"
import { Address } from "./addresses"

/**
 * `BalanceTypes` is an automatically determined sub-selection of `PluginBalanceTypes`.
 *
 * It is the same list, but with any invalid `BalanceType` definitions filtered out.
 */
export type BalanceTypes = {
  // Check that each plugin-provided BalanceType is a valid BalanceType (i.e. has all of the IBalance fields)
  [BalanceType in keyof PluginBalanceTypes]: PluginBalanceTypes[BalanceType] extends IBalance
    ? // Include the valid balance type in BalanceTypes
      PluginBalanceTypes[BalanceType]
    : // Don't include the invalid balance type
      never
}

/**
 * The `BalanceJson` sum type, which is a union of all of the possible `BalanceTypes`.
 *
 * Each variant comes from a plugin in use by the consuming app.
 *
 * For example, in an app with the `substrate-native`, `evm-native`, `substrate-orml` and `evm-erc20` plugins:
 *
 *     type BalanceJson = SubNativeBalance | EvmNativeBalance | SubOrmlBalance | EvmErc20Balance
 *
 * If `BalanceTypes` is empty then `BalanceJson` will fall back to the common `IBalance` interface, which every balance must implement.
 */
export type BalanceJson = BalanceTypes[keyof BalanceTypes] extends never
  ? // When no PluginBalanceTypes provided, default to the base IBalance
    IBalance
  : BalanceTypes[keyof BalanceTypes]

/** A collection of `BalanceJson` objects */
export type BalanceJsonList = Record<string, BalanceJson>

export type BalanceStatus = "live" | "cache"

/** `IBalance` is a common interface which all balance types must implement. */
export type IBalance = {
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

  // TODO: Add a field which groups all of the types of balances together.
  // Different sources can add whatever types they want to add to this list, in a type-safe way.
  // i.e. the end user of these libs will be able to access the available types of balances for each group.
  // Also, in the Balance type, ensure that trying to access a non-existent field for one balance type will just return `0`.
}

/** Used by plugins to help define their custom `BalanceType` */
export type NewBalanceType<
  ModuleType extends string,
  T extends Record<string, unknown>
> = IBalance & { source: ModuleType } & T
