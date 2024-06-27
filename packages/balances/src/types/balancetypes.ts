import { PluginBalanceTypes } from "@talismn/balances/plugins"
import { ChainId, EvmChainId, EvmNetworkId, SubChainId, TokenId } from "@talismn/chaindata-provider"

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
 * For example, in an app with the `substrate-native`, `evm-native`, `substrate-tokens` and `evm-erc20` plugins:
 *
 *     type BalanceJson = SubNativeBalance | EvmNativeBalance | SubTokensBalance | EvmErc20Balance
 *
 * If `BalanceTypes` is empty then `BalanceJson` will fall back to the common `IBalance` interface, which every balance must implement.
 */
export type BalanceJson = BalanceTypes[keyof BalanceTypes] extends never
  ? // When no PluginBalanceTypes provided, default to the base IBalance
    IBalance
  : BalanceTypes[keyof BalanceTypes]

/** A collection of `BalanceJson` objects */
export type BalanceJsonList = Record<string, BalanceJson>

export type BalanceStatus =
  // balance is subscribed to the on-chain value and up to date
  | "live"
  // balance was retrieved from the chain and the stored value is being displayed.
  // This balance is currently awaiting updates from the chain.
  | "cache"
  // balance was retrieved from the chain but we're unable to create a new subscription
  | "stale"

type IBalanceBase = {
  /** The module that this balance was retrieved by */
  source: string

  useLegacyTransferableCalculation?: boolean

  /** Has this balance never been fetched, or is it from a cache, or is it up to date? */
  status: BalanceStatus

  /** The address of the account which owns this balance */
  address: Address
  /** The token this balance is for */
  tokenId: TokenId
}

type IBalanceBaseEvm = {
  /** WIP, use `chainId` or `evmNetworkId` for now */
  multiChainId: EvmChainId
  /** The evm chain this balance is on */
  evmNetworkId: EvmNetworkId
}

type IBalanceBaseSubstrate = {
  multiChainId: SubChainId
  /** The substrate chain this balance is on */
  chainId: ChainId
}

type IBalanceSimpleValues = {
  /** For balance types with a simple value, this is the value of the balance (eg, evm native token balance) */
  value: Amount
  values?: Array<AmountWithLabel<string>>
}

type IBalanceComplexValues = {
  /** For balance types with multple possible states, these are the values of the balance (eg, substrate native token balance) */
  values: Array<AmountWithLabel<string>>
  value?: undefined
}

/** `IBalance` is a common interface which all balance types must implement. */
export type IBalance = IBalanceBase &
  (IBalanceSimpleValues | IBalanceComplexValues) &
  (IBalanceBaseEvm | IBalanceBaseSubstrate)

export type EvmBalance = IBalanceBase &
  IBalanceBaseEvm &
  (IBalanceSimpleValues | IBalanceComplexValues)
export type SubstrateBalance = IBalanceBase &
  IBalanceBaseSubstrate &
  (IBalanceSimpleValues | IBalanceComplexValues)

/** An unlabelled amount of a balance */
export type Amount = string

export type BalanceStatusTypes = "free" | "reserved" | "locked" | "extra" | "crowdloan" | "nompool"

/** A labelled amount of a balance */
type BaseAmountWithLabel<TLabel extends string> = {
  type: BalanceStatusTypes
  /**
   * For modules which fetch balances via module sources, the source is equivalent to previous 'subSource' field
   * on the parent balance object
   * e.g. `staking` or `crowdloans`
   **/
  source?: string
  label: TLabel
  amount: Amount
  meta?: unknown
}

export const getValueId = (amount: AmountWithLabel<string>) => {
  const getMetaId = () => {
    const meta = amount.meta as { poolId?: number; paraId?: number } | undefined
    if (!meta) return ""
    if (amount.type === "crowdloan") return meta.paraId?.toString() ?? ""
    if (amount.type === "nompool") return meta.poolId?.toString() ?? ""
    return ""
  }

  return [amount.label, amount.type, amount.source, getMetaId()].join("::")
}

/** A labelled locked amount of a balance */
export type LockedAmount<TLabel extends string> = BaseAmountWithLabel<TLabel> & {
  /**
   * By default, the largest locked amount is subtrated from the transferable amount of this balance.
   * If this property is set to true, this particular lock will be skipped when making this calculation.
   * As such, this locked amount will be included in the calculated transferable amount.
   */
  includeInTransferable?: boolean

  /**
   * By default, tx fees can be deducted from locked amounts of balance.
   * As such, locked amounts are ignored when calculating if the user has enough funds to pay tx fees.
   * If this property is set to true, this particular lock will be subtracted from the available funds when making this calculation.
   * As such, this locked amount will not be included in the calculated available funds.
   */
  excludeFromFeePayable?: boolean
}

export type AmountWithLabel<TLabel extends string> =
  | BaseAmountWithLabel<TLabel>
  | LockedAmount<TLabel>
  | ExtraAmount<TLabel>

/** A labelled extra amount of a balance */
export type ExtraAmount<TLabel extends string> = BaseAmountWithLabel<TLabel> & {
  type: "extra"
  /** If set to true, this extra amount will be included in the calculation of the total amount of this balance. */
  includeInTotal?: boolean
}

/** Used by plugins to help define their custom `BalanceType` */
export type NewBalanceType<
  TModuleType extends string,
  TBalanceValueType extends "simple" | "complex",
  TNetworkType extends "ethereum" | "substrate"
> = IBalanceBase &
  (TBalanceValueType extends "simple" ? IBalanceSimpleValues : IBalanceComplexValues) &
  (TNetworkType extends "ethereum" ? IBalanceBaseEvm : IBalanceBaseSubstrate) & {
    source: TModuleType
  }
