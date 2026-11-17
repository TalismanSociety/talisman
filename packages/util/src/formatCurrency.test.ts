import { describe, expect, it } from "vitest"
import { formatCurrency } from "./formatCurrency"

describe("formatCurrency", () => {
  it("uses the symbol of crypto currencies that Intl only knows by code", () => {
    expect(formatCurrency(1234.5, "tao")).toEqual("τ1,234.50")
    expect(formatCurrency(1234.5, "btc")).toEqual("₿1,234.50")
    expect(formatCurrency(1234.5, "ETH")).toEqual("Ξ1,234.50")
    expect(formatCurrency(-0.42, "tao")).toEqual("-τ0.42")
    expect(formatCurrency(1234567, "tao", { notation: "compact" })).toEqual("τ1.2M")
  })

  it("keeps the code when it is asked for", () => {
    expect(formatCurrency(1234.5, "tao", { currencyDisplay: "code" })).toEqual("TAO\u00a01,234.50")
  })

  it("keeps the code of a crypto currency without a symbol", () => {
    expect(formatCurrency(1234.5, "dot")).toEqual("DOT\u00a01,234.50")
  })

  it("formats fiat currencies with Intl", () => {
    expect(formatCurrency(1234.5, "usd", { currencyDisplay: "narrowSymbol" })).toEqual("$1,234.50")
    expect(formatCurrency(1234.5, "eur")).toEqual("€1,234.50")
    expect(formatCurrency(1234, "jpy")).toEqual("¥1,234")
  })
})
