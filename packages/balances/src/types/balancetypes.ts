import { PluginBalanceTypes } from "@talismn/balances/plugins"
import { ChainId, EvmNetworkId, MultiChainId, TokenId } from "@talismn/chaindata-provider"
import { BigMath } from "@talismn/util"

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

export type BalanceStatusLive = `live-${string}`
export const BalanceStatusLive = (subscriptionId: string): BalanceStatusLive =>
  `live-${subscriptionId}`
export type BalanceStatus =
  // balance is subscribed to the on-chain value and up to date
  // (NOTE: format: `live-${subscriptionId}`, if subscriptionId is out of
  // date then balance status should be considered as `cache`)
  | BalanceStatusLive
  // balance is subscribed to the on-chain value and up to date
  | "live"
  // balance was retrieved from the chain but is no longer subscribed
  | "cache"
  // balance was retrieved from the chain but we're unable to create a new subscription
  | "stale"
  // balance has never been retrieved yet
  | "initializing"

/** `IBalance` is a common interface which all balance types must implement. */
export type IBalance = {
  /** The module that this balance was retrieved by */
  source: string
  /**
   * For modules which fetch balances via module sources, this is the sub-source
   * e.g. `staking` or `crowdloans`
   **/
  subSource?: string

  useLegacyTransferableCalculation?: boolean

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
} & IBalanceAmounts
export type IBalanceAmounts = {
  /** The portion of a balance that is not reserved. The free balance is the only balance that matters for most operations. */
  free?:
    | Amount // module has only one free amount
    | AmountWithLabel<string> // module has only one free amount, but it has a label
    | Array<AmountWithLabel<string>> // module has multiple free amounts

  /** The portion of a balance that is owned by the account but is reserved/suspended/unavailable. Reserved balance can still be slashed, but only after all the free balance has been slashed. */
  reserves?:
    | Amount // module has only one reserved amount
    | AmountWithLabel<string> // module has only one reserved amount, but it has a label
    | Array<AmountWithLabel<string>> // module has multiple reserved amounts

  /** A freeze on a specified amount of an account's free balance until a specified block number. Multiple locks always operate over the same funds, so they overlay rather than stack. */
  locks?:
    | Amount // module has only one lock
    | LockedAmount<string> // module has only one lock, but it has a label or should be included in the transferable amount
    | Array<LockedAmount<string>> // module has multiple locks

  /** Additional balances held by an account. By default these will not be included in the account total. Dapps may choose to add support for showing extra amounts on a case by case basis. */
  extra?:
    | ExtraAmount<string> // module has only one extra amount
    | Array<ExtraAmount<string>> // module has multiple extra amounts
}

/** An unlabelled amount of a balance */
export type Amount = string

/** A labelled amount of a balance */
export type AmountWithLabel<TLabel extends string> = {
  label: TLabel
  amount: Amount
  meta?: unknown
}

/** A labelled locked amount of a balance */
export type LockedAmount<TLabel extends string> = AmountWithLabel<TLabel> & {
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

export function excludeFromTransferableAmount(
  locks: Amount | LockedAmount<string> | Array<LockedAmount<string>>
): bigint {
  if (typeof locks === "string") return BigInt(locks)
  if (!Array.isArray(locks)) locks = [locks]

  return locks
    .filter((lock) => lock.includeInTransferable !== true)
    .map((lock) => BigInt(lock.amount))
    .reduce((max, lock) => BigMath.max(max, lock), 0n)
}
export function excludeFromFeePayableLocks(
  locks: Amount | LockedAmount<string> | Array<LockedAmount<string>>
): Array<LockedAmount<string>> {
  if (typeof locks === "string") return []
  if (!Array.isArray(locks)) locks = [locks]

  return locks.filter((lock) => lock.excludeFromFeePayable)
}

/** A labelled extra amount of a balance */
export type ExtraAmount<TLabel extends string> = AmountWithLabel<TLabel> & {
  /** If set to true, this extra amount will be included in the calculation of the total amount of this balance. */
  includeInTotal?: boolean
}

export function includeInTotalExtraAmount(
  extra?: ExtraAmount<string> | Array<ExtraAmount<string>>
): bigint {
  if (!extra) return 0n
  if (!Array.isArray(extra)) extra = [extra]

  return extra
    .filter((extra) => extra.includeInTotal)
    .map((extra) => BigInt(extra.amount))
    .reduce((a, b) => a + b, 0n)
}

/** Used by plugins to help define their custom `BalanceType` */
export type NewBalanceType<TModuleType extends string, T extends IBalanceAmounts> = IBalance & {
  source: TModuleType
} & T
