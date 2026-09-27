import { evmErc20TokenId } from "@talismn/chaindata-provider"
import { newTokenRates, type TokenRateCurrency, type TokenRates } from "@talismn/token-rates"
import { BigMath, isBigInt } from "@talismn/util"
import BigNumber from "../configureBigNumber"
import type { BalanceSource, HydrateDb } from "../types/balances"
import type {
  AmountWithLabel,
  BalanceJson,
  BalanceStatusTypes,
  ExtraAmount,
  IBalance,
} from "../types/balancetypes"
import type { FormattedAmount } from "./FormattedAmount"
import { BalanceFormatter, BalanceValueGetter } from "./formatters"
import {
  excludeFromFeePayableLocks,
  excludeFromTransferableAmount,
  getBalanceId,
  includeInTotalExtraAmount,
} from "./helpers"

export class Balance {
  //
  // Properties
  //

  /** The underlying data for this balance */
  readonly #storage: BalanceJson
  readonly #valueGetter: BalanceValueGetter

  #db: HydrateDb | null = null

  // lazily-computed caches for the hot accessors: sorting/summing/filtering loops read
  // these repeatedly, and each uncached access re-derives values and allocates several
  // BalanceFormatters. `undefined` = not yet computed. #storage is immutable in practice
  // (the only mutator, addValue, is unused legacy), so caches only invalidate when the
  // hydrate db changes (rates/tokens affect every derived value).
  #cachedRates: TokenRates | null | undefined = undefined
  #cachedTotal: BalanceFormatter | undefined = undefined
  #cachedFree: BalanceFormatter | undefined = undefined
  #cachedReserved: BalanceFormatter | undefined = undefined
  #cachedLocked: BalanceFormatter | undefined = undefined
  #cachedTransferable: BalanceFormatter | undefined = undefined
  #cachedUnavailable: BalanceFormatter | undefined = undefined
  #cachedFeePayable: BalanceFormatter | undefined = undefined

  #invalidateComputed = () => {
    this.#cachedRates = undefined
    this.#cachedTotal = undefined
    this.#cachedFree = undefined
    this.#cachedReserved = undefined
    this.#cachedLocked = undefined
    this.#cachedTransferable = undefined
    this.#cachedUnavailable = undefined
    this.#cachedFeePayable = undefined
  }

  //
  // Methods
  //

  constructor(storage: BalanceJson | IBalance, hydrate?: HydrateDb) {
    this.#storage = storage as BalanceJson
    this.#valueGetter = new BalanceValueGetter(this.#storage)
    if (hydrate !== undefined) this.hydrate(hydrate)
  }

  toJSON = (): BalanceJson => this.#storage

  isSource = (source: BalanceSource) => this.#storage.source === source

  hydrate = (hydrate?: HydrateDb) => {
    if (hydrate !== undefined && hydrate !== this.#db) {
      this.#db = hydrate
      this.#invalidateComputed()
    }
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

  get networkId() {
    return this.#storage.networkId
  }

  get network() {
    return this.#db?.networks?.[this.networkId] || null
  }

  get tokenId() {
    return this.#storage.tokenId
  }
  get token() {
    return this.#db?.tokens?.[this.tokenId] || null
  }
  get decimals() {
    return this.token?.decimals || null
  }
  get rates(): TokenRates | null {
    if (this.#cachedRates === undefined) this.#cachedRates = this.#computeRates()
    return this.#cachedRates
  }

  #computeRates = (): TokenRates | null => {
    // uniswap v2 lp tokens need the rates from the underlying pool assets
    //
    // To note: `@talismn/token-rates` knows to fetch the `coingeckoId0` and `coingeckoId1` rates for evm-uniswapv2 tokens.
    // They are then stored in `this.#db.tokenRates` using the `tokenId0` and `tokenId1` keys.
    //
    // This means that those rates are always available for calculating the uniswapv2 rates,
    // regardless of whether or not the underlying erc20s are actually in chaindata and enabled.
    if (this.isSource("evm-uniswapv2") && this.token?.type === "evm-uniswapv2") {
      const tokenId0 = evmErc20TokenId(this.networkId, this.token.tokenAddress0)
      const tokenId1 = evmErc20TokenId(this.networkId, this.token.tokenAddress1)

      const decimals = this.token.decimals
      const decimals0 = this.token.decimals0
      const decimals1 = this.token.decimals1

      const rates0 = this.#db?.tokenRates?.[tokenId0]
      const rates1 = this.#db?.tokenRates?.[tokenId1]

      if (rates0 === undefined || rates1 === undefined) return null

      const extra = this.#valueGetter.get("extra")
      const extras = Array.isArray(extra) ? extra : extra !== undefined ? [extra] : []
      const totalSupply = extras.find((extra) => extra.label === "totalSupply")?.amount ?? "0"
      const reserve0 = extras.find((extra) => extra.label === "reserve0")?.amount ?? "0"
      const reserve1 = extras.find((extra) => extra.label === "reserve1")?.amount ?? "0"

      const totalSupplyTokens = BigNumber(totalSupply).times(10 ** (-1 * decimals))
      const reserve0Tokens = BigNumber(reserve0).times(10 ** (-1 * decimals0))
      const reserve1Tokens = BigNumber(reserve1).times(10 ** (-1 * decimals1))

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
              reserve0Tokens.times(rates0[currency]?.price ?? 0),
              reserve1Tokens.times(rates1[currency]?.price ?? 0)
            ),
          ] as const
      )

      const lpTokenRates = newTokenRates()
      totalValueLocked.forEach(([currency, tvl]) => {
        // divide `the value of all lp tokens` by `the number of lp tokens` to get `the value per token`
        if (!totalSupplyTokens.eq(0))
          lpTokenRates[currency] = { price: tvl.div(totalSupplyTokens).toNumber() }
      })

      return lpTokenRates
    }

    // other tokens (including dtao alpha tokens, whose rates the host computes from the
    // subnet pool price) can just pick from the tokenRates db using the tokenId
    return this.#db?.tokenRates?.[this.tokenId] || null
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

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: legacy
  private addValue(valueType: BalanceStatusTypes) {
    return (value: Omit<AmountWithLabel<string>, "type">) => this.#valueGetter.add(valueType, value)
  }
  /**
   * The total balance of this token.
   * Includes the free and the reserved amount.
   * The balance will be reaped if this goes below the existential deposit.
   */
  get total() {
    if (this.#cachedTotal === undefined) this.#cachedTotal = this.#computeTotal()
    return this.#cachedTotal
  }

  #computeTotal = () => {
    const extra = this.getValue("extra") as FormattedAmount<ExtraAmount<string>, string>[]

    // if there is a DelegatedStaking hold (new model: polkadot, kusama), nom pool staked amount is included in reserved
    // if not (old model: vara, avail, cere), staked amount is not in the account and it needs to be added to the total
    const nomPoolStakedPlancks = this.locks.some(
      (lock) => lock.source === "substrate-native-holds" && lock.label === "DelegatedStaking"
    )
      ? 0n
      : this.nompools.map(({ amount }) => amount.planck).reduce((a, b) => a + b, 0n)

    return this.#format(
      this.free.planck +
        this.reserved.planck +
        nomPoolStakedPlancks +
        includeInTotalExtraAmount(extra)
    )
  }
  /** The non-reserved balance of this token. Includes the frozen amount. Is included in the total. */
  get free() {
    if (this.#cachedFree === undefined) this.#cachedFree = this.#computeFree()
    return this.#cachedFree
  }

  #computeFree = () => {
    // for simple balances
    if ("value" in this.#storage && this.#storage.value) return this.#format(this.#storage.value)

    // for complex balances
    const freeValues = this.getValue("free")
    const totalFree = freeValues.map(({ amount }) => amount.planck).reduce((a, b) => a + b, 0n)
    return this.#format(totalFree)
  }
  /** The reserved balance of this token. Is included in the total. */
  get reserved() {
    if (this.#cachedReserved === undefined) this.#cachedReserved = this.#computeReserved()
    return this.#cachedReserved
  }

  #computeReserved = () => {
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
    if (this.#cachedLocked === undefined)
      this.#cachedLocked = this.#format(
        this.locks.map(({ amount }) => amount.planck).reduce((a, b) => BigMath.max(a, b), 0n)
      )
    return this.#cachedLocked
  }

  get locks() {
    return this.getValue("locked")
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
    if (this.#cachedTransferable === undefined)
      this.#cachedTransferable = this.#computeTransferable()
    return this.#cachedTransferable
  }

  #computeTransferable = () => {
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
    if (this.#cachedUnavailable === undefined) this.#cachedUnavailable = this.#computeUnavailable()
    return this.#cachedUnavailable
  }

  #computeUnavailable = () => {
    const oldCalculation = () => this.locked.planck + this.reserved.planck
    const newCalculation = () => BigMath.max(this.locked.planck, this.reserved.planck)
    const baseUnavailable = this.#storage.useLegacyTransferableCalculation
      ? oldCalculation()
      : newCalculation()

    // if there is a DelegatedStaking hold (new model: polkadot, kusama), nom pool staked amount is included in reserved
    // if not (old model: vara, avail, cere), staked amount is not in the account and it needs to be added to the total
    const nomPoolStakedPlancks = this.locks.some(
      (lock) => lock.source === "substrate-native-holds" && lock.label === "DelegatedStaking"
    )
      ? 0n
      : this.nompools.map(({ amount }) => amount.planck).reduce((a, b) => a + b, 0n)

    return this.#format(baseUnavailable + nomPoolStakedPlancks)
  }

  /** The feePayable balance of this token. Is generally the free amount - the feeFrozen amount. */
  get feePayable() {
    if (this.#cachedFeePayable === undefined) this.#cachedFeePayable = this.#computeFeePayable()
    return this.#cachedFeePayable
  }

  #computeFeePayable = () => {
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

/** raw values of a given type, straight from the IBalance JSON (no Balance/formatter allocation) */
