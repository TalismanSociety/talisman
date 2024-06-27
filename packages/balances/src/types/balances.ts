import { ChainList, EvmNetworkList, TokenList } from "@talismn/chaindata-provider"
import { NewTokenRates, TokenRateCurrency, TokenRates, TokenRatesList } from "@talismn/token-rates"
import { BigMath, NonFunctionProperties, isArrayOf, isBigInt, planckToTokens } from "@talismn/util"
import BigNumber from "bignumber.js"

import log from "../log"
import {
  Amount,
  AmountWithLabel,
  BalanceJson,
  BalanceJsonList,
  BalanceStatusTypes,
  ExtraAmount,
  IBalance,
  LockedAmount,
} from "./balancetypes"

type FormattedAmount<GenericAmount extends AmountWithLabel<TLabel>, TLabel extends string> = Omit<
  GenericAmount,
  "amount"
> & {
  amount: BalanceFormatter
}

export function excludeFromTransferableAmount(
  locks:
    | Amount
    | FormattedAmount<LockedAmount<string>, string>
    | Array<FormattedAmount<LockedAmount<string>, string>>
): bigint {
  if (typeof locks === "string") return BigInt(locks)
  if (!Array.isArray(locks)) locks = [locks]

  return locks
    .filter((lock) => lock.includeInTransferable !== true)
    .map((lock) => lock.amount.planck)
    .reduce((max, lock) => BigMath.max(max, lock), 0n)
}

export function excludeFromFeePayableLocks(
  locks: Amount | LockedAmount<string> | Array<LockedAmount<string>>
): Array<LockedAmount<string>> {
  if (typeof locks === "string") return []
  if (!Array.isArray(locks)) locks = [locks]

  return locks.filter((lock) => lock.excludeFromFeePayable)
}

export function includeInTotalExtraAmount(
  extra?:
    | FormattedAmount<ExtraAmount<string>, string>
    | Array<FormattedAmount<ExtraAmount<string>, string>>
): bigint {
  if (!extra) return 0n
  if (!Array.isArray(extra)) extra = [extra]

  return extra
    .filter((extra) => extra.includeInTotal)
    .map((extra) => extra.amount.planck)
    .reduce((a, b) => a + b, 0n)
}

/**
 * Have the importing library define its Token and BalanceJson enums (as a sum type of all plugins) and pass them into some
 * internal global typescript context, which is then picked up on by this module.
 */

/** A utility type used to extract the underlying `BalanceType` of a specific source from a generalised `BalanceJson` */
export type NarrowBalanceType<S extends IBalance, P> = S extends { source: P } ? S : never
export type BalanceSource = BalanceJson["source"]

/** TODO: Remove this in favour of a frontend-friendly `ChaindataProvider` */
export type HydrateDb = Partial<{
  chains: ChainList
  evmNetworks: EvmNetworkList
  tokens: TokenList
  tokenRates: TokenRatesList
}>

export type BalanceSearchQuery =
  | Partial<NonFunctionProperties<Balance>>
  | ((balance: Balance) => boolean)

/**
 * A collection of balances.
 */
export class Balances {
  //
  // Properties
  //

  #balances: Array<Balance> = []

  //
  // Methods
  //

  constructor(
    balances: Balances | BalanceJsonList | Balance[] | BalanceJson[] | Balance,
    hydrate?: HydrateDb
  ) {
    // handle Balances (convert to Balance[])
    if (balances instanceof Balances) return new Balances(balances.each, hydrate)

    // handle Balance (convert to Balance[])
    if (balances instanceof Balance) return new Balances([balances], hydrate)

    // handle BalanceJsonList (the only remaining non-array type of balances) (convert to BalanceJson[])
    if (!Array.isArray(balances)) return new Balances(Object.values(balances), hydrate)

    // handle no balances
    if (balances.length === 0) return this

    // handle BalanceJson[]
    if (!isArrayOf(balances, Balance))
      return new Balances(
        balances.map((storage) => new Balance(storage)),
        hydrate
      )

    // handle Balance[]
    this.#balances = balances
    if (hydrate !== undefined) this.hydrate(hydrate)
  }

  /**
   * Calling toJSON on a collection of balances will return the underlying BalanceJsonList.
   */
  toJSON = (): BalanceJsonList =>
    Object.fromEntries(
      this.#balances
        .map((balance) => {
          try {
            return [balance.id, balance.toJSON()]
          } catch (error) {
            log.error("Failed to convert balance to JSON", error, { id: balance.id, balance })
            return null
          }
        })
        .filter(Array.isArray)
    );

  /**
   * Allows the collection to be iterated over.
   *
   * @example
   * [...balances].forEach(balance => { // do something // })
   *
   * @example
   * for (const balance of balances) {
   *   // do something
   * }
   */
  [Symbol.iterator] = () =>
    // Create an array of the balances in this collection and return the result of its iterator.
    this.#balances[Symbol.iterator]()

  /**
   * Hydrates all balances in this collection.
   *
   * @param sources - The sources to hydrate from.
   */
  hydrate = (sources: HydrateDb) => {
    this.#balances.map((balance) => balance.hydrate(sources))
  }

  /**
   * Retrieve a balance from this collection by id.
   *
   * @param id - The id of the balance to fetch.
   * @returns The balance if one exists, or none.
   */
  get = (id: string): Balance | null => this.#balances.find((balance) => balance.id === id) ?? null

  /**
   * Retrieve balances from this collection by search query.
   *
   * @param query - The search query.
   * @returns All balances which match the query.
   */
  find = (query: BalanceSearchQuery | BalanceSearchQuery[]): Balances => {
    // construct filter
    const queryArray: BalanceSearchQuery[] = Array.isArray(query) ? query : [query]
    const orQueries = queryArray.map((query) =>
      typeof query === "function" ? query : Object.entries(query)
    )

    // filter balances
    const filter = (balance: Balance) =>
      orQueries.some((query) =>
        typeof query === "function"
          ? query(balance)
          : query.every(([key, value]) => balance[key as keyof BalanceSearchQuery] === value)
      )

    // return filter matches
    return new Balances([...this].filter(filter))
  }

  /**
   * Filters this collection to exclude token balances where the token has a `mirrorOf` field
   * and another balance exists in this collection for the token specified by the `mirrorOf` field.
   */
  filterMirrorTokens = (): Balances => new Balances([...this].filter(filterMirrorTokens))

  /**
   * Filters this collection to only include balances which are not zero AND have a fiat conversion rate.
   */
  filterNonZeroFiat = (
    type:
      | "total"
      | "free"
      | "reserved"
      | "locked"
      | "frozen"
      | "transferable"
      | "unavailable"
      | "feePayable",
    currency: TokenRateCurrency
  ): Balances => {
    const filter = (balance: Balance) => (balance[type].fiat(currency) ?? 0) > 0
    return this.find(filter)
  }

  /**
   * Add some balances to this collection.
   * Added balances take priority over existing balances.
   * The aggregation of the two collections is returned.
   * The original collection is not mutated.
   *
   * @param balances - Either a balance or collection of balances to add.
   * @returns The new collection of balances.
   */
  add = (balances: Balances | Balance): Balances => {
    // handle single balance
    if (balances instanceof Balance) return this.add(new Balances(balances))

    // merge balances
    const mergedBalances = Object.fromEntries(
      this.#balances.map((balance) => [balance.id, balance])
    )
    balances.each.forEach((balance) => (mergedBalances[balance.id] = balance))

    // return new balances
    return new Balances(Object.values(mergedBalances))
  }

  /**
   * Remove balances from this collection by id.
   * A new collection without these balances is returned.
   * The original collection is not mutated.
   *
   * @param ids - The id(s) of the balances to remove.
   * @returns The new collection of balances.
   */
  remove = (ids: string[] | string): Balances => {
    // handle single id
    if (!Array.isArray(ids)) return this.remove([ids])

    // merge and return new balances
    return new Balances(this.#balances.filter((balance) => !ids.includes(balance.id)))
  }

  // TODO: Add some more useful aggregator methods

  get each() {
    return [...this]
  }

  /**
   * Get an array of balances in this collection, sorted by chain sortIndex.
   *
   * @returns A sorted array of the balances in this collection.
   */
  get sorted() {
    return [...this].sort(
      (a, b) =>
        ((a.chain || a.evmNetwork)?.sortIndex ?? Number.MAX_SAFE_INTEGER) -
        ((b.chain || b.evmNetwork)?.sortIndex ?? Number.MAX_SAFE_INTEGER)
    )
  }

  /**
   * Get the number of balances in this collection.
   *
   * @returns The number of balances in this collection.
   */
  get count() {
    return [...this].length
  }

  /**
   * Get the summed value of balances in this collection.
   * TODO: Sum up token amounts AND fiat amounts
   *
   * @example
   * // Get the sum of all transferable balances in usd.
   * balances.sum.fiat('usd').transferable
   */
  get sum() {
    return new SumBalancesFormatter(this)
  }
}

type BalanceJsonEvm = BalanceJson & { evmNetworkId: string }

const isBalanceEvm = (balance: BalanceJson): balance is BalanceJsonEvm => "evmNetworkId" in balance

export const getBalanceId = (balance: BalanceJson) => {
  const { source, address, tokenId } = balance
  const locationId = isBalanceEvm(balance) ? balance.evmNetworkId : balance.chainId
  return [source, address, locationId, tokenId].filter(Boolean).join("::")
}

/**
 * An individual balance.
 */
export class Balance {
  //
  // Properties
  //

  /** The underlying data for this balance */
  readonly #storage: BalanceJson
  readonly #valueGetter: BalanceValueGetter

  #db: HydrateDb | null = null

  //
  // Methods
  //

  constructor(storage: BalanceJson, hydrate?: HydrateDb) {
    this.#storage = storage
    this.#valueGetter = new BalanceValueGetter(this.#storage)
    if (hydrate !== undefined) this.hydrate(hydrate)
  }

  toJSON = (): BalanceJson => this.#storage

  isSource = (source: BalanceSource) => this.#storage.source === source
  // // TODO: Fix this method, the types don't work with our plugin architecture.
  // // Specifically, the `BalanceJson` type is compiled down to `IBalance` in the following way:
  // //
  // //     toJSON: () => BalanceJson // works
  // //     isSource: (source: BalanceSource) => boolean // works
  // //     asSource: <P extends string>(source: P) => NarrowBalanceType<IBalance, P> | null // Doesn't work! IBalance should just be BalanceJson!
  // //
  // // `IBalance` won't match the type of `BalanceSource` after `PluginBalanceTypes` has been extended by balance plugins.
  // // As a result, typescript will think that the returned #storage is not a BalanceJson.
  // asSource = <P extends BalanceSource>(source: P): NarrowBalanceType<BalanceJson, P> | null => {
  //   if (this.#storage.source === source) return this.#storage as NarrowBalanceType<BalanceJson, P>
  //   return null
  // }

  hydrate = (hydrate?: HydrateDb) => {
    if (hydrate !== undefined) this.#db = hydrate
  }

  #format = (balance: bigint | string) =>
    new BalanceFormatter(
      isBigInt(balance) ? balance.toString() : balance,
      this.decimals || undefined,
      this.rates
    )

  //
  // Accessors
  //

  get id(): string {
    return getBalanceId(this.#storage)
  }

  get source() {
    return this.#storage.source
  }

  get status() {
    return this.#storage.status
  }

  get address() {
    return this.#storage.address
  }

  get chainId() {
    return isBalanceEvm(this.#storage) ? undefined : this.#storage.chainId
  }
  get chain() {
    return (this.#db?.chains && this.chainId && this.#db?.chains[this.chainId]) || null
  }

  get evmNetworkId() {
    return isBalanceEvm(this.#storage) ? this.#storage.evmNetworkId : undefined
  }
  get evmNetwork() {
    return (
      (this.#db?.evmNetworks && this.evmNetworkId && this.#db?.evmNetworks[this.evmNetworkId]) ||
      null
    )
  }

  get tokenId() {
    return this.#storage.tokenId
  }
  get token() {
    return (this.#db?.tokens && this.#db?.tokens[this.tokenId]) || null
  }
  get decimals() {
    return this.token?.decimals || null
  }
  get rates(): TokenRates | null {
    // uniswap v2 lp tokens need the rates from the underlying pool assets
    //
    // To note: `@talismn/token-rates` knows to fetch the `coingeckoId0` and `coingeckoId1` rates for evm-uniswapv2 tokens.
    // They are then stored in `this.#db.tokenRates` using the `tokenId0` and `tokenId1` keys.
    //
    // This means that those rates are always available for calculating the uniswapv2 rates,
    // regardless of whether or not the underlying erc20s are actually in chaindata and enabled.
    if (
      this.isSource("evm-uniswapv2") &&
      this.token?.type === "evm-uniswapv2" &&
      this.evmNetworkId
    ) {
      const tokenId0 = evmErc20TokenId(this.evmNetworkId, this.token.tokenAddress0)
      const tokenId1 = evmErc20TokenId(this.evmNetworkId, this.token.tokenAddress1)

      const decimals = this.token.decimals
      const decimals0 = this.token.decimals0
      const decimals1 = this.token.decimals1

      const rates0 = this.#db?.tokenRates && this.#db.tokenRates[tokenId0]
      const rates1 = this.#db?.tokenRates && this.#db.tokenRates[tokenId1]

      if (rates0 === undefined || rates1 === undefined) return null

      const extra = this.#valueGetter.get("extra")
      const extras = Array.isArray(extra) ? extra : extra !== undefined ? [extra] : []
      const totalSupply = extras.find((extra) => extra.label === "totalSupply")?.amount ?? "0"
      const reserve0 = extras.find((extra) => extra.label === "reserve0")?.amount ?? "0"
      const reserve1 = extras.find((extra) => extra.label === "reserve1")?.amount ?? "0"

      const totalSupplyTokens = BigNumber(totalSupply).times(Math.pow(10, -1 * decimals))
      const reserve0Tokens = BigNumber(reserve0).times(Math.pow(10, -1 * decimals0))
      const reserve1Tokens = BigNumber(reserve1).times(Math.pow(10, -1 * decimals1))

      const rates0Currencies = new Set(Object.keys(rates0) as TokenRateCurrency[])
      const rates1Currencies = new Set(Object.keys(rates1) as TokenRateCurrency[])
      // `Set.prototype.intersection` can eventually replace this
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/intersection
      const currencies = [...rates0Currencies].filter((c) => rates1Currencies.has(c))

      const totalValueLocked = currencies.map(
        (currency) =>
          [
            currency,
            // tvl (in a given currency) == reserve0*currencyRate0 + reserve1*currencyRate1
            BigNumber.sum(
              reserve0Tokens.times(rates0[currency] ?? 0),
              reserve1Tokens.times(rates1[currency] ?? 0)
            ),
          ] as const
      )

      const lpTokenRates = NewTokenRates()
      totalValueLocked.forEach(([currency, tvl]) => {
        // divide `the value of all lp tokens` by `the number of lp tokens` to get `the value per token`
        if (!totalSupplyTokens.eq(0)) lpTokenRates[currency] = tvl.div(totalSupplyTokens).toNumber()
      })

      return lpTokenRates
    }

    // other tokens can just pick from the tokenRates db using the tokenId
    return (this.#db?.tokenRates && this.#db.tokenRates[this.tokenId]) || null
  }

  /**
   * A general method to get formatted values matching a certain type from this balance.
   * @param valueType - The type of value to get.
   * @returns An array of the values matching the type with formatted amounts.
   */
  private getValue(
    valueType: BalanceStatusTypes
  ): Array<FormattedAmount<AmountWithLabel<string>, string>> {
    return this.getRawValue(valueType).map((value) => ({
      ...value,
      amount: this.#format(value.amount),
    }))
  }

  /**
   * A general method to get values matching a certain type from this balance.
   * @param valueType - The type of value to get.
   * @returns An array of the values matching the type.
   */
  private getRawValue(valueType: BalanceStatusTypes): Array<AmountWithLabel<string>> {
    return this.#valueGetter.get(valueType)
  }

  /**
   * A general method to add a value to the array of values for this balance.
   * @param valueType - The type of value to add.
   * @returns A function which can be used to add a value to the array of values for this balance.
   */
  private addValue(valueType: BalanceStatusTypes) {
    return (value: Omit<AmountWithLabel<string>, "type">) => this.#valueGetter.add(valueType, value)
  }
  /**
   * The total balance of this token.
   * Includes the free and the reserved amount.
   * The balance will be reaped if this goes below the existential deposit.
   */
  get total() {
    const extra = this.getValue("extra") as FormattedAmount<ExtraAmount<string>, string>[]

    return this.#format(
      this.free.planck +
        this.reserved.planck +
        this.nompools.map(({ amount }) => amount.planck).reduce((a, b) => a + b, 0n) +
        this.crowdloans.map(({ amount }) => amount.planck).reduce((a, b) => a + b, 0n) +
        includeInTotalExtraAmount(extra)
    )
  }
  /** The non-reserved balance of this token. Includes the frozen amount. Is included in the total. */
  get free() {
    // for simple balances
    if ("value" in this.#storage && this.#storage.value) return this.#format(this.#storage.value)

    // for complex balances
    const freeValues = this.getValue("free")
    const totalFree = freeValues.map(({ amount }) => amount.planck).reduce((a, b) => a + b, 0n)
    return this.#format(totalFree)
  }
  /** The reserved balance of this token. Is included in the total. */
  get reserved() {
    const reservedValues = this.getValue("reserved")
    if (reservedValues.length === 0) return this.#format(0n)

    return this.#format(
      reservedValues.map(({ amount }) => amount.planck).reduce((a, b) => a + b, 0n)
    )
  }
  get reserves() {
    return this.getValue("reserved")
  }
  /** The frozen balance of this token. Is included in the free amount. */
  get locked() {
    return this.#format(
      this.locks.map(({ amount }) => amount.planck).reduce((a, b) => BigMath.max(a, b), 0n)
    )
  }

  get locks() {
    return this.getValue("locked")
  }

  get crowdloans() {
    return this.getValue("crowdloan")
  }

  get nompools() {
    return this.getValue("nompool")
  }

  /** The extra balance of this token */
  get extra() {
    const extra = this.getRawValue("extra")
    if (extra.length > 0) return extra as ExtraAmount<string>[]
    return undefined
  }

  /** @deprecated Use balance.locked */
  get frozen() {
    return this.locked
  }
  /** The transferable balance of this token. Is generally the free amount - the miscFrozen amount. */
  get transferable() {
    /**
     * As you can see here, `locked` is subtracted from `free` in order to derive `transferable`.
     *
     * |--------------------------total--------------------------|
     * |-------------------free-------------------|---reserved---|
     * |----locked-----|-------transferable-------|
     */
    const oldTransferableCalculation = () => {
      // if no locks exist, transferable is equal to the free amount
      if (this.locks.length === 0) return this.free

      // find the largest lock (but ignore any locks which are marked as `includeInTransferable`)
      const excludeAmount = excludeFromTransferableAmount(this.locks)

      // subtract the lock from the free amount (but don't go below 0)
      return this.#format(BigMath.max(this.free.planck - excludeAmount, 0n))
    }

    /**
     * As you can see here, `locked` is subtracted from `free + reserved` in order to derive `transferable`.
     *
     * Alternatively, `reserved` is subtracted from `locked` in order to derive `untouchable`,
     * which is then subtracted from `free` in order to derive `transferable`.
     *
     * |--------------------------total--------------------------|
     * |---reserved---|-------------------free-------------------|
     *                |--untouchable--|
     * |------------locked------------|-------transferable-------|
     */
    const newTransferableCalculation = () => {
      // if no locks exist, transferable is equal to the free amount
      if (this.locks.length === 0) return this.free

      // find the largest lock (but ignore any locks which are marked as `includeInTransferable`)
      // subtract the reserved amount, because locks now act upon the total balance - not just the free balance
      const untouchableAmount = BigMath.max(
        excludeFromTransferableAmount(this.locks) - this.reserved.planck,
        0n
      )

      // subtract the untouchable amount from the free amount (but don't go below 0)
      return this.#format(BigMath.max(this.free.planck - untouchableAmount, 0n))
    }

    if (this.#storage.useLegacyTransferableCalculation) return oldTransferableCalculation()
    return newTransferableCalculation()
  }
  /**
   * The unavailable balance of this token.
   * Prior to the Fungible trait, this was the locked amount + the reserved amount, i.e. `locked + reserved`.
   * Now, it is the bigger of the locked amount and the reserved amounts, i.e. `max(locked, reserved)`.
   */
  get unavailable() {
    const oldCalculation = () => this.locked.planck + this.reserved.planck
    const newCalculation = () => BigMath.max(this.locked.planck, this.reserved.planck)
    const baseUnavailable = this.#storage.useLegacyTransferableCalculation
      ? oldCalculation()
      : newCalculation()
    const otherUnavailable =
      this.crowdloans.reduce((total, each) => total + each.amount.planck, 0n) +
      this.nompools.reduce((total, each) => total + each.amount.planck, 0n)
    return this.#format(baseUnavailable + otherUnavailable)
  }

  /** The feePayable balance of this token. Is generally the free amount - the feeFrozen amount. */
  get feePayable() {
    // if no locks exist, feePayable is equal to the free amount
    if (this.locks.length === 0) return this.free

    // find the largest lock which can't be used to pay tx fees
    const excludeAmount = excludeFromFeePayableLocks(this.locked.planck.toString())
      .map((lock) => BigInt(lock.amount))
      .reduce((max, lock) => BigMath.max(max, lock), 0n)

    // subtract the lock from the free amount (but don't go below 0)
    return this.#format(BigMath.max(this.free.planck - excludeAmount, 0n))
  }
}

export class BalanceValueGetter {
  #storage: BalanceJson

  constructor(storage: BalanceJson) {
    this.#storage = storage
  }

  get(valueType: BalanceStatusTypes) {
    if ("values" in this.#storage && this.#storage.values)
      return this.#storage.values.filter(({ type }) => type === valueType)
    return []
  }

  add(valueType: BalanceStatusTypes, amount: Omit<AmountWithLabel<string>, "type">) {
    if ("values" in this.#storage && this.#storage.values)
      this.#storage.values.push({ type: valueType, ...amount })
  }
}

export class BalanceFormatter {
  #planck: string
  #decimals: number
  #fiatRatios: TokenRates | null

  constructor(
    planck: string | bigint | undefined,
    decimals?: number | undefined,
    fiatRatios?: TokenRates | null
  ) {
    this.#planck = isBigInt(planck) ? planck.toString() : planck ?? "0"
    this.#decimals = decimals || 0
    this.#fiatRatios = fiatRatios || null
  }

  toJSON = () => this.#planck

  get planck() {
    return BigInt(this.#planck)
  }

  get tokens() {
    return planckToTokens(this.#planck, this.#decimals)
  }

  fiat(currency: TokenRateCurrency) {
    if (!this.#fiatRatios) return null

    const ratio = this.#fiatRatios[currency]
    if (!ratio) return null

    return parseFloat(this.tokens) * ratio
  }
}

export class PlanckSumBalancesFormatter {
  #balances: Balances

  constructor(balances: Balances) {
    this.#balances = balances
  }

  #sum = (
    balanceField: {
      [K in keyof Balance]: Balance[K] extends BalanceFormatter ? K : never
    }[keyof Balance]
  ) => {
    // a function to get a planck amount from a balance
    const planck = (balance: Balance) => balance[balanceField].planck ?? 0n

    return this.#balances.filterMirrorTokens().each.reduce(
      // add the total amount to the planck amount of each balance
      (total, balance) => total + planck(balance),
      // start with a total of 0
      0n
    )
  }

  /**
   * The total balance of these tokens. Includes the free and the reserved amount.
   */
  get total() {
    return this.#sum("total")
  }
  /** The non-reserved balance of these tokens. Includes the frozen amount. Is included in the total. */
  get free() {
    return this.#sum("free")
  }
  /** The reserved balance of these tokens. Is included in the total. */
  get reserved() {
    return this.#sum("reserved")
  }
  /** The frozen balance of these tokens. Is included in the free amount. */
  get locked() {
    return this.#sum("locked")
  }
  /** @deprecated Use balances.locked */
  get frozen() {
    return this.locked
  }
  /** The transferable balance of these tokens. Is generally the free amount - the miscFrozen amount. */
  get transferable() {
    return this.#sum("transferable")
  }
  /** The unavailable balance of these tokens. */
  get unavailable() {
    return this.#sum("unavailable")
  }

  /** The feePayable balance of these tokens. Is generally the free amount - the feeFrozen amount. */
  get feePayable() {
    return this.#sum("feePayable")
  }
}

export class FiatSumBalancesFormatter {
  #balances: Balances
  #currency: TokenRateCurrency

  constructor(balances: Balances, currency: TokenRateCurrency) {
    this.#balances = balances
    this.#currency = currency
  }

  #sum = (
    balanceField: {
      [K in keyof Balance]: Balance[K] extends BalanceFormatter ? K : never
    }[keyof Balance]
  ) => {
    // a function to get a fiat amount from a balance
    const fiat = (balance: Balance) => balance[balanceField].fiat(this.#currency) ?? 0

    return this.#balances.filterMirrorTokens().each.reduce(
      // add the total amount to the fiat amount of each balance
      (total, balance) => total + fiat(balance),
      // start with a total of 0
      0
    )
  }

  /**
   * The total balance of these tokens. Includes the free and the reserved amount.
   */
  get total() {
    return this.#sum("total")
  }
  /** The non-reserved balance of these tokens. Includes the frozen amount. Is included in the total. */
  get free() {
    return this.#sum("free")
  }
  /** The reserved balance of these tokens. Is included in the total. */
  get reserved() {
    return this.#sum("reserved")
  }
  /** The frozen balance of these tokens. Is included in the free amount. */
  get locked() {
    return this.#sum("locked")
  }
  /** @deprecated Use balances.locked */
  get frozen() {
    return this.locked
  }
  /** The transferable balance of these tokens. Is generally the free amount - the miscFrozen amount. */
  get transferable() {
    return this.#sum("transferable")
  }
  /** The unavailable balance of these tokens. */
  get unavailable() {
    return this.#sum("unavailable")
  }
  /** The feePayable balance of these tokens. Is generally the free amount - the feeFrozen amount. */
  get feePayable() {
    return this.#sum("feePayable")
  }
}

export class SumBalancesFormatter {
  #balances: Balances

  constructor(balances: Balances) {
    this.#balances = balances
  }

  get planck() {
    return new PlanckSumBalancesFormatter(this.#balances)
  }

  fiat(currency: TokenRateCurrency) {
    return new FiatSumBalancesFormatter(this.#balances, currency)
  }
}

export const filterMirrorTokens = (balance: Balance, i: number, balances: Balance[]) => {
  const mirrorOf = balance.token?.mirrorOf
  return !mirrorOf || !balances.find((b) => b.tokenId === mirrorOf)
}

// TODO: Move this into a common module which can then be imported both here and into EvmErc20Module
// We can't import this directly from EvmErc20Module because then we'd have a circular dependency
const evmErc20TokenId = (chainId: string, tokenContractAddress: string) =>
  `${chainId}-evm-erc20-${tokenContractAddress}`.toLowerCase()
