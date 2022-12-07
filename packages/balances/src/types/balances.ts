import { ChainList, EvmNetworkList, TokenList } from "@talismn/chaindata-provider"
import { TokenRateCurrency, TokenRates, TokenRatesList } from "@talismn/token-rates"
import { BigMath, NonFunctionProperties, isArrayOf, planckToTokens } from "@talismn/util"
import memoize from "lodash/memoize"
import { Memoize } from "typescript-memoize"

import log from "../log"
import {
  BalanceJson,
  BalanceJsonList,
  IBalance,
  excludeFromFeePayableLocks,
  excludeFromTransferableAmount,
  includeInTotalExtraAmount,
} from "./balancetypes"

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

  #balances: Record<string, Balance> = {}

  //
  // Methods
  //

  constructor(
    balances: Balances | BalanceJsonList | Balance[] | BalanceJson[] | Balance,
    hydrate?: HydrateDb
  ) {
    // handle Balances (convert to Balance[])
    if (balances instanceof Balances) return new Balances([...balances], hydrate)

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
    this.#balances = Object.fromEntries(balances.map((balance) => [balance.id, balance]))
    if (hydrate !== undefined) this.hydrate(hydrate)
  }

  /**
   * Calling toJSON on a collection of balances will return the underlying BalanceJsonList.
   */
  toJSON = (): BalanceJsonList =>
    Object.fromEntries(
      Object.entries(this.#balances)
        .map(([id, balance]) => {
          try {
            return [id, balance.toJSON()]
          } catch (error) {
            log.error("Failed to convert balance to JSON", error, { id, balance })
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
    Object.values(this.#balances)[Symbol.iterator]()

  /**
   * Hydrates all balances in this collection.
   *
   * @param sources - The sources to hydrate from.
   */
  hydrate = (sources: HydrateDb) => {
    Object.values(this.#balances).map((balance) => balance.hydrate(sources))
  }

  /**
   * Retrieve a balance from this collection by id.
   *
   * @param id - The id of the balance to fetch.
   * @returns The balance if one exists, or none.
   */
  get = (id: string): Balance | null => this.#balances[id] || null

  /**
   * Retrieve balances from this collection by search query.
   *
   * @param query - The search query.
   * @returns All balances which match the query.
   */
  find = (query: BalanceSearchQuery | BalanceSearchQuery[]): Balances => {
    // construct filter
    const orQueries = (Array.isArray(query) ? query : [query]).map((query) =>
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
    const mergedBalances = { ...this.#balances }
    ;[...balances].forEach((balance) => (mergedBalances[balance.id] = balance))

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

    // merge balances
    const removedBalances = { ...this.#balances }
    ids.forEach((id) => delete removedBalances[id])

    // return new balances
    return new Balances(Object.values(removedBalances))
  }

  // TODO: Add some more useful aggregator methods

  /**
   * Get an array of balances in this collection, sorted by chain sortIndex.
   *
   * @returns A sorted array of the balances in this collection.
   */
  @Memoize()
  get sorted() {
    return [...this].sort(
      (a, b) =>
        ((a.chain || a.evmNetwork)?.sortIndex || Number.MAX_SAFE_INTEGER) -
        ((b.chain || b.evmNetwork)?.sortIndex || Number.MAX_SAFE_INTEGER)
    )
  }

  /**
   * Get the number of balances in this collection.
   *
   * @returns The number of balances in this collection.
   */
  @Memoize()
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
  @Memoize()
  get sum() {
    return new SumBalancesFormatter(this)
  }
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

  #db: HydrateDb | null = null

  //
  // Methods
  //

  constructor(storage: BalanceJson, hydrate?: HydrateDb) {
    this.#format = memoize(this.#format)
    this.#storage = storage
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
      typeof balance === "bigint" ? balance.toString() : balance,
      this.decimals || undefined,
      this.#db?.tokenRates && this.#db.tokenRates[this.tokenId]
    )

  //
  // Accessors
  //

  get id(): string {
    const { source, address, chainId, evmNetworkId, tokenId } = this.#storage
    const locationId = chainId !== undefined ? chainId : evmNetworkId
    return `${source}-${address}-${locationId}-${tokenId}`
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
    return this.#storage.chainId
  }
  get chain() {
    return (this.#db?.chains && this.chainId && this.#db?.chains[this.chainId]) || null
  }
  get evmNetworkId() {
    return this.#storage.evmNetworkId
  }
  get evmNetwork() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (this.#db?.evmNetworks && this.#db?.evmNetworks[this.evmNetworkId!]) || null
  }
  get tokenId() {
    return this.#storage.tokenId
  }
  get token() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (this.#db?.tokens && this.#db?.tokens[this.tokenId!]) || null
  }
  get decimals() {
    return this.token?.decimals || null
  }
  get rates() {
    return (this.#db?.tokenRates && this.#db.tokenRates[this.tokenId]) || null
  }

  /**
   * The total balance of this token.
   * Includes the free and the reserved amount.
   * The balance will be reaped if this goes below the existential deposit.
   */
  @Memoize()
  get total() {
    const extra = includeInTotalExtraAmount(this.#storage.extra)
    return this.#format(this.free.planck + this.reserved.planck + extra)
  }
  /** The non-reserved balance of this token. Includes the frozen amount. Is included in the total. */
  @Memoize()
  get free() {
    return this.#format(
      typeof this.#storage.free === "string"
        ? BigInt(this.#storage.free)
        : Array.isArray(this.#storage.free)
        ? this.#storage.free
            .map((reserve) => BigInt(reserve.amount))
            .reduce((a, b) => a + b, BigInt("0"))
        : BigInt(this.#storage.free?.amount || "0")
    )
  }
  /** The reserved balance of this token. Is included in the total. */
  @Memoize()
  get reserved() {
    return this.#format(
      typeof this.#storage.reserves === "string"
        ? BigInt(this.#storage.reserves)
        : Array.isArray(this.#storage.reserves)
        ? this.#storage.reserves
            .map((reserve) => BigInt(reserve.amount))
            .reduce((a, b) => a + b, BigInt("0"))
        : BigInt(this.#storage.reserves?.amount || "0")
    )
  }
  /** The frozen balance of this token. Is included in the free amount. */
  @Memoize()
  get locked() {
    return this.#format(
      typeof this.#storage.locks === "string"
        ? BigInt(this.#storage.locks)
        : Array.isArray(this.#storage.locks)
        ? this.#storage.locks
            .map((lock) => BigInt(lock.amount))
            .reduce((a, b) => BigMath.max(a, b), BigInt("0"))
        : BigInt(this.#storage.locks?.amount || "0")
    )
  }
  /** @depreacted - use balance.locked */
  @Memoize()
  get frozen() {
    return this.locked
  }
  /** The transferable balance of this token. Is generally the free amount - the miscFrozen amount. */
  @Memoize()
  get transferable() {
    // if no locks exist, transferable is equal to the free amount
    if (!this.#storage.locks) return this.free

    // find the largest lock (but ignore any locks which are marked as `includeInTransferable`)
    const excludeAmount = excludeFromTransferableAmount(this.#storage.locks)

    // subtract the lock from the free amount (but don't go below 0)
    return this.#format(BigMath.max(this.free.planck - excludeAmount, BigInt("0")))
  }
  /** The feePayable balance of this token. Is generally the free amount - the feeFrozen amount. */
  @Memoize()
  get feePayable() {
    // if no locks exist, feePayable is equal to the free amount
    if (!this.#storage.locks) return this.free

    // find the largest lock which can't be used to pay tx fees
    const excludeAmount = excludeFromFeePayableLocks(this.#storage.locks)
      .map((lock) => BigInt(lock.amount))
      .reduce((max, lock) => BigMath.max(max, lock), BigInt("0"))

    // subtract the lock from the free amount (but don't go below 0)
    return this.#format(BigMath.max(this.free.planck - excludeAmount, BigInt("0")))
  }
}

export class BalanceFormatter {
  #planck: string
  #decimals: number
  #fiatRatios: TokenRates | null

  constructor(
    planck: string | bigint | undefined,
    decimals?: number | undefined,
    fiatRatios?: TokenRates
  ) {
    this.#planck = typeof planck === "bigint" ? planck.toString() : planck ?? "0"
    this.#decimals = decimals || 0
    this.#fiatRatios = fiatRatios || null

    this.fiat = memoize(this.fiat)
  }

  toJSON = () => this.#planck

  get planck() {
    return BigInt(this.#planck)
  }

  @Memoize()
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

export class FiatSumBalancesFormatter {
  #balances: Balances
  #currency: TokenRateCurrency

  constructor(balances: Balances, currency: TokenRateCurrency) {
    this.#balances = balances
    this.#currency = currency

    this.#sum = memoize(this.#sum)
  }

  #sum = (
    balanceField: {
      [K in keyof Balance]: Balance[K] extends BalanceFormatter ? K : never
    }[keyof Balance]
  ) => {
    // a function to get a fiat amount from a balance
    const fiat = (balance: Balance) => balance[balanceField].fiat(this.#currency) || 0

    // a function to add two amounts
    const sum = (a: number, b: number) => a + b

    return [...this.#balances].reduce(
      (total, balance) =>
        sum(
          // add the total amount...
          total,
          // ...to the fiat amount of each balance
          fiat(balance)
        ),
      // start with a total of 0
      0
    )
  }

  /**
   * The total balance of these tokens. Includes the free and the reserved amount.
   */
  @Memoize()
  get total() {
    return this.#sum("total")
  }
  /** The non-reserved balance of these tokens. Includes the frozen amount. Is included in the total. */
  @Memoize()
  get free() {
    return this.#sum("free")
  }
  /** The reserved balance of these tokens. Is included in the total. */
  @Memoize()
  get reserved() {
    return this.#sum("reserved")
  }
  /** The frozen balance of these tokens. Is included in the free amount. */
  @Memoize()
  get locked() {
    return this.#sum("locked")
  }
  /** @deprecated - use balances.locked */
  @Memoize()
  get frozen() {
    return this.locked
  }
  /** The transferable balance of these tokens. Is generally the free amount - the miscFrozen amount. */
  @Memoize()
  get transferable() {
    return this.#sum("transferable")
  }
  /** The feePayable balance of these tokens. Is generally the free amount - the feeFrozen amount. */
  @Memoize()
  get feePayable() {
    return this.#sum("feePayable")
  }
}

export class SumBalancesFormatter {
  #balances: Balances

  constructor(balances: Balances) {
    this.#balances = balances

    this.fiat = memoize(this.fiat)
  }

  fiat(currency: TokenRateCurrency) {
    return new FiatSumBalancesFormatter(this.#balances, currency)
  }
}
