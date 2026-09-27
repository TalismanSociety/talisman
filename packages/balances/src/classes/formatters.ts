import type { TokenRateCurrency, TokenRates } from "@talismn/token-rates"
import { isBigInt, planckToTokens } from "@talismn/util"
import type { AmountWithLabel, BalanceJson, BalanceStatusTypes } from "../types/balancetypes"

import type { Balance } from "./Balance"
import type { Balances } from "./Balances"

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
  #tokenRates: TokenRates | null

  constructor(
    planck: string | bigint | undefined,
    decimals?: number | undefined,
    fiatRatios?: TokenRates | null
  ) {
    this.#planck = isBigInt(planck) ? planck.toString() : (planck ?? "0")
    this.#decimals = decimals || 0
    this.#tokenRates = fiatRatios || null
  }

  toJSON = () => this.#planck

  get planck() {
    return BigInt(this.#planck)
  }

  get tokens() {
    return planckToTokens(this.#planck, this.#decimals)
  }

  fiat(currency: TokenRateCurrency) {
    if (!this.#tokenRates) return null

    const ratio = this.#tokenRates[currency]
    if (!ratio) return null

    return parseFloat(this.tokens) * ratio.price
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

  change24h(currency: TokenRateCurrency) {
    return new Change24hCurrencyFormatter(this.#balances, currency)
  }
}

export class Change24hCurrencyFormatter {
  #balances: Balances
  #currency: TokenRateCurrency

  constructor(balances: Balances, currency: TokenRateCurrency) {
    this.#balances = balances
    this.#currency = currency
  }

  #change24h = (
    balanceField: {
      [K in keyof Balance]: Balance[K] extends BalanceFormatter ? K : never
    }[keyof Balance]
  ) => {
    const output = this.#balances.filterMirrorTokens().each.reduce(
      // add the total amount to the fiat amount of each balance
      (acc, balance) => {
        const change24h = balance.rates?.[this.#currency]?.change24h
        if (typeof change24h !== "number") return acc
        const fiat = balance[balanceField].fiat(this.#currency)
        if (!fiat) return acc

        return {
          totalFiatDiff: acc.totalFiatDiff + fiat * change24h,
          totalFiat: acc.totalFiat + fiat,
        }
      },
      // start with a total of 0
      { totalFiatDiff: 0, totalFiat: 0 }
    )

    return output.totalFiat === 0
      ? null
      : {
          diff: output.totalFiatDiff / 100,
          ratio: output.totalFiatDiff / output.totalFiat,
        }
  }

  get total() {
    return this.#change24h("total")
  }
  get free() {
    return this.#change24h("free")
  }
  get reserved() {
    return this.#change24h("reserved")
  }
  get locked() {
    return this.#change24h("locked")
  }
  get frozen() {
    return this.#change24h("frozen")
  }
  get transferable() {
    return this.#change24h("transferable")
  }
  get unavailable() {
    return this.#change24h("unavailable")
  }
  get feePayable() {
    return this.#change24h("feePayable")
  }
}
