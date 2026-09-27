import type { TokenRateCurrency } from "@talismn/token-rates"
import { isArrayOf } from "@talismn/util"

import log from "../log"
import type { BalanceSearchQuery, HydrateDb } from "../types/balances"
import type { BalanceJson, BalanceJsonList, IBalance } from "../types/balancetypes"
import { Balance } from "./Balance"
import { SumBalancesFormatter } from "./formatters"

/**
 * A collection of balances.
 */
export class Balances {
  //
  // Properties
  //

  #balancesMap: Map<string, Balance> = new Map()
  #cachedArray: Balance[] | null = null
  #cachedFilteredMirrorTokens: Balances | null = null
  #cachedSumFormatter: SumBalancesFormatter | null = null

  //
  // Methods
  //

  constructor(
    balances: Balances | BalanceJsonList | Balance[] | IBalance[] | BalanceJson[] | Balance,
    hydrate?: HydrateDb
  ) {
    // biome-ignore lint/correctness/noConstructorReturn: legacy
    if (balances == null) return this

    // handle Balances (convert to Balance[])
    // biome-ignore lint/correctness/noConstructorReturn: legacy
    if (balances instanceof Balances) return new Balances([...balances], hydrate)

    // handle Balance (convert to Balance[])
    // biome-ignore lint/correctness/noConstructorReturn: legacy
    if (balances instanceof Balance) return new Balances([balances], hydrate)

    // handle BalanceJsonList (the only remaining non-array type of balances) (convert to BalanceJson[])
    // biome-ignore lint/correctness/noConstructorReturn: legacy
    if (!Array.isArray(balances)) return new Balances(Object.values(balances), hydrate)

    // handle no balances
    // biome-ignore lint/correctness/noConstructorReturn: legacy
    if (balances.length === 0) return this

    // handle BalanceJson[]
    if (!isArrayOf(balances, Balance))
      // biome-ignore lint/correctness/noConstructorReturn: legacy
      return new Balances(
        balances.map((storage) => new Balance(storage)),
        hydrate
      )

    // handle Balance[]
    this.#balancesMap = new Map(balances.map((b) => [b.id, b]))
    if (hydrate !== undefined) this.hydrate(hydrate)
  }

  /**
   * Calling toJSON on a collection of balances will return the underlying BalanceJsonList.
   */
  toJSON = (): BalanceJsonList =>
    Object.fromEntries(
      [...this.#balancesMap.values()]
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
  [Symbol.iterator] = () => this.#balancesMap.values()[Symbol.iterator]()

  /**
   * Hydrates all balances in this collection.
   *
   * @param sources - The sources to hydrate from.
   */
  hydrate = (sources: HydrateDb) => {
    // Invalidate caches — hydrate mutates Balance objects, so derived caches become stale
    this.#cachedArray = null
    this.#cachedFilteredMirrorTokens = null
    this.#cachedSumFormatter = null
    for (const balance of this.#balancesMap.values()) balance.hydrate(sources)
  }

  /**
   * Retrieve a balance from this collection by id.
   *
   * @param id - The id of the balance to fetch.
   * @returns The balance if one exists, or none.
   */
  get = (id: string): Balance | null => this.#balancesMap.get(id) ?? null

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
    return new Balances(this.#toArray().filter(filter))
  }

  /**
   * Filters this collection to exclude token balances where the token has a `mirrorOf` field
   * and another balance exists in this collection for the token specified by the `mirrorOf` field.
   */
  filterMirrorTokens = (): Balances => {
    if (!this.#cachedFilteredMirrorTokens) {
      const balances = this.#toArray()
      const tokenIds = new Set<string>()
      for (const b of balances) {
        if (b.tokenId) tokenIds.add(b.tokenId)
      }
      this.#cachedFilteredMirrorTokens = new Balances(
        balances.filter((balance) => {
          const mirrorOf = balance.token?.mirrorOf
          return !mirrorOf || !tokenIds.has(mirrorOf)
        })
      )
    }
    return this.#cachedFilteredMirrorTokens
  }

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
    if (balances instanceof Balance) return this.add(new Balances(balances))
    const mergedMap = new Map(this.#balancesMap)
    for (const balance of balances) mergedMap.set(balance.id, balance)
    return new Balances([...mergedMap.values()])
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
    if (!Array.isArray(ids)) return this.remove([ids])
    const idSet = new Set(ids)
    return new Balances(this.#toArray().filter((balance) => !idSet.has(balance.id)))
  }

  #toArray = (): Balance[] => {
    if (!this.#cachedArray) this.#cachedArray = [...this.#balancesMap.values()]
    return this.#cachedArray
  }

  get each() {
    return this.#toArray()
  }

  /** @deprecated use each instead */
  get sorted() {
    return this.each
  }

  /**
   * Get the number of balances in this collection.
   *
   * @returns The number of balances in this collection.
   */
  get count() {
    return this.#balancesMap.size
  }

  /**
   * Get the summed value of balances in this collection.
   *
   * @example
   * // Get the sum of all transferable balances in usd.
   * balances.sum.fiat('usd').transferable
   */
  get sum() {
    if (!this.#cachedSumFormatter) this.#cachedSumFormatter = new SumBalancesFormatter(this)
    return this.#cachedSumFormatter
  }
}
