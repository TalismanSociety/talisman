import { Chain, ChainId } from "@core/domains/chains/types"
import {
  EvmNetwork,
  EvmNetworkId,
  Token,
  TokenId,
  TokenRateCurrency,
  TokenRates,
} from "@core/types"
import { NonFunctionProperties } from "@core/util/FunctionPropertyNames"
import isArrayOf from "@core/util/isArrayOf"
import { planckToTokens } from "@core/util/planckToTokens"
import BigMath from "@talisman/util/bigMath"
import memoize from "lodash/memoize"
import { Memoize } from "typescript-memoize"

import { BalanceStorage, BalancesStorage, NarrowStorage } from "./storages"

export type BalancePallet = BalanceStorage["pallet"]

export type ChainsDb = Record<ChainId, Chain>
export type EvmNetworksDb = Record<EvmNetworkId, EvmNetwork>
export type TokensDb = Record<TokenId, Token>
export type HydrateDb = Partial<{
  chains: ChainsDb
  evmNetworks: EvmNetworksDb
  tokens: TokensDb
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
    balances: Balances | BalancesStorage | Balance[] | BalanceStorage[] | Balance,
    hydrate?: HydrateDb
  ) {
    // handle Balances (convert to Balance[])
    if (balances instanceof Balances) return new Balances([...balances], hydrate)

    // handle Balance (convert to Balance[])
    if (balances instanceof Balance) return new Balances([balances], hydrate)

    // handle BalancesStorage (the only remaining non-array type of balances) (convert to BalanceStorage[])
    if (!Array.isArray(balances)) return new Balances(Object.values(balances), hydrate)

    // handle no balances
    if (balances.length === 0) return this

    // handle BalanceStorage[]
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
   * Calling toJSON on a collection of balances will return the underlying BalancesStorage.
   */
  toJSON = (): BalancesStorage =>
    Object.fromEntries(
      Object.entries(this.#balances).map(([id, balance]) => [id, balance.toJSON()])
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
  readonly #storage: BalanceStorage

  #db: HydrateDb | null = null

  //
  // Methods
  //

  constructor(storage: BalanceStorage, hydrate?: HydrateDb) {
    this.#format = memoize(this.#format)
    this.#storage = storage
    if (hydrate !== undefined) this.hydrate(hydrate)
  }

  toJSON = () => this.#storage

  isPallet = (pallet: BalancePallet) => this.#storage.pallet === pallet
  asPallet = <P extends BalancePallet>(pallet: P): NarrowStorage<BalanceStorage, P> | null => {
    if (this.#storage.pallet === pallet) return this.#storage as NarrowStorage<BalanceStorage, P>
    return null
  }

  hydrate = (hydrate?: HydrateDb) => {
    if (hydrate !== undefined) this.#db = hydrate
  }

  #format = (balance: bigint | string) =>
    new BalanceFormatter(
      typeof balance === "bigint" ? balance.toString() : balance,
      this.decimals || undefined,
      this.token?.rates || undefined
    )

  //
  // Accessors
  //

  get id(): string {
    const { pallet, address, chainId, evmNetworkId, tokenId } = this.#storage
    const locationId = chainId !== undefined ? chainId : evmNetworkId
    return `${pallet}-${address}-${locationId}-${tokenId}`
  }

  get pallet() {
    return this.#storage.pallet
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

  /**
   * The total balance of this token.
   * Includes the free and the reserved amount.
   * The balance will be reaped if this goes below the existential deposit.
   */
  @Memoize()
  get total() {
    return this.#format(this.free.planck + this.reserved.planck)
  }
  /** The non-reserved balance of this token. Includes the frozen amount. Is included in the total. */
  @Memoize()
  get free() {
    return this.#format(this.#storage.free)
  }
  /** The reserved balance of this token. Is included in the total. */
  @Memoize()
  get reserved() {
    if (this.#storage.pallet === "erc20") return this.#format("0")
    return this.#format(this.#storage.reserved)
  }
  /** The frozen balance of this token. Is included in the free amount. */
  @Memoize()
  get frozen() {
    if (this.#storage.pallet === "erc20") return this.#format("0")

    // if using the balances pallet, add up the feeFrozen and miscFrozen amounts
    if (this.#storage.pallet === "balances") {
      return this.#format(BigInt(this.#storage.feeFrozen) + BigInt(this.#storage.miscFrozen))
    }

    return this.#format(this.#storage.frozen)
  }
  /** The transferable balance of this token. Is generally the free amount - the miscFrozen amount. */
  @Memoize()
  get transferable() {
    // if using the balances pallet, only subtract miscFrozen (not feeFrozen) from free
    // also, don't go below 0
    if (this.#storage.pallet === "balances") {
      return this.#format(
        BigMath.max(this.free.planck - BigInt(this.#storage.miscFrozen), BigInt("0"))
      )
    }

    // subtract frozen from free (but don't go below 0)
    return this.#format(BigMath.max(this.free.planck - this.frozen.planck, BigInt("0")))
  }
  /** The feePayable balance of this token. Is generally the free amount - the feeFrozen amount. */
  @Memoize()
  get feePayable() {
    // fees are only paid in native tokens (i.e. balances pallet) so feeFrozen is always 0 for orml
    if (this.#storage.pallet !== "balances") return this.free

    // subtract feeFrozen from free (but don't go below 0)
    return this.#format(
      BigMath.max(this.free.planck - BigInt(this.#storage.feeFrozen), BigInt("0"))
    )
  }
}

export class BalanceFormatter {
  #planck: string
  #decimals: number
  #fiatRatios: TokenRates | null

  constructor(planck: string | bigint, decimals?: number, fiatRatios?: TokenRates) {
    this.#planck = typeof planck === "bigint" ? planck.toString() : planck
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
  get frozen() {
    return this.#sum("frozen")
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
