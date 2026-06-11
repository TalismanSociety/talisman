import type { NetworkId, TokenId } from "@talismn/chaindata-provider"

import type { Address } from "./addresses"

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

  networkId: NetworkId
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
export type IBalance = IBalanceBase & (IBalanceSimpleValues | IBalanceComplexValues)

export type BalanceJson = IBalance

/** A collection of `BalanceJson` objects */
export type BalanceJsonList = Record<string, BalanceJson>

/** An unlabelled amount of a balance */
export type Amount = string

export type BalanceStatusTypes = "free" | "reserved" | "locked" | "extra" | "nompool"

/** A labelled amount of a balance */
type BaseAmountWithLabel<TLabel extends string> = {
  type: BalanceStatusTypes
  /**
   * For modules which fetch balances via module sources, the source is equivalent to previous 'subSource' field
   * on the parent balance object
   * e.g. `staking`
   **/
  source?: string
  label: TLabel
  amount: Amount
  meta?: unknown // TODO type this with an object that has a discriminator property
}

export const getValueId = (amount: AmountWithLabel<string>) => {
  const getMetaId = () => {
    const meta = amount.meta as { poolId?: number; paraId?: number } | undefined
    if (!meta) return ""
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

  /**
   * By default, a lock only constrains the transferable amount of the balance it is reported on.
   * If this property is set to true, the portion of this lock which exceeds its own balance's free
   * amount is also subtracted from the summed transferable amount of a Balances collection,
   * because it constrains the sibling balances of the sum (eg a dtao conviction lock, reported on
   * the subnet's base token, constrains the coldkey's staking positions across the whole subnet).
   */
  overflowToSumTransferable?: boolean
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
