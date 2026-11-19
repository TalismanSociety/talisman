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

  it("keeps the code of a crypto currency without a symbol", () => {
    expect(formatCurrency(1234.5, "dot")).toEqual("DOT 1,234.50")
  })

  it("formats fiat currencies with their symbol, and the dollar without its country", () => {
    expect(formatCurrency(1234.5, "usd")).toEqual("$1,234.50")
    expect(formatCurrency(1234.5, "USD")).toEqual("$1,234.50")
    expect(formatCurrency(1234.5, "eur")).toEqual("€1,234.50")
    expect(formatCurrency(1234, "jpy")).toEqual("¥1,234")
  })

  it("puts the code after the value in code display", () => {
    expect(formatCurrency(3.19, "tao", { currencyDisplay: "code" })).toEqual("3.19 TAO")
    expect(formatCurrency(610.66, "usd", { currencyDisplay: "code" })).toEqual("610.66 USD")
    expect(formatCurrency(-12.5, "eth", { currencyDisplay: "code" })).toEqual("-12.50 ETH")
    expect(
      formatCurrency(1234567, "tao", { currencyDisplay: "code", notation: "compact" })
    ).toEqual("1.2M TAO")
  })

  it("caps decimals at the 20 that Intl supports", () => {
    expect(formatCurrency(1e-25, "tao", { minimumFractionDigits: 27 })).toEqual(
      "τ0.00000000000000000000"
    )
  })
})
