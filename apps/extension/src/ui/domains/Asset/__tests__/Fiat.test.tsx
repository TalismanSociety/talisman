import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { Fiat } from "../Fiat"

vi.mock("@ui/state/settings", () => ({
  useSelectedCurrency: () => "usd",
  useSettingValue: () => false,
}))

vi.mock("@ui/state/fiatFromUsd", () => ({
  useFiatFromUsd: (amount: number) => amount,
}))

const browserDigitsWiderThanCurrency = vi.hoisted(() => ({ currency: "" }))
vi.mock("@talismn/util", async (importOriginal) => {
  const util = await importOriginal<typeof import("@talismn/util")>()
  return {
    ...util,
    getCurrencyFractionDigits: (currency: string) =>
      currency === browserDigitsWiderThanCurrency.currency
        ? 0
        : util.getCurrencyFractionDigits(currency),
  }
})

describe("Fiat balance", () => {
  afterEach(() => {
    browserDigitsWiderThanCurrency.currency = ""
  })

  test.each([
    [19329819.44, "vnd", "₫19,329,819"],
    [115001.4, "jpy", "¥115,001"],
    [1234.5, "usd", "$1,234.50"],
    [0.0123456, "btc", "₿0.012346"],
    [0.000678, "eth", "Ξ0.00068"],
    [0.00624, "tao", "τ0.0062"],
  ] as const)("animates %s %s to %s", async (amount, currency, expected) => {
    render(<Fiat amount={amount} forceCurrency={currency} isBalance />)

    expect(await screen.findByText(expected)).toBeTruthy()
  })

  test.each([
    [0.4, "vnd", "< ₫1"],
    [0.004, "usd", "< $0.01"],
    [0.0000004, "btc", "< ₿0.000001"],
    [0.000004, "eth", "< Ξ0.00001"],
    [0.00004, "tao", "< τ0.0001"],
  ] as const)("shows %s %s below its smallest unit as %s", async (amount, currency, expected) => {
    render(<Fiat amount={amount} forceCurrency={currency} isBalance />)

    expect(await screen.findByText(expected)).toBeTruthy()
  })

  test.each([true, false])(
    "rounds to the currency's digits when the browser allows more, noCountUp %s",
    async (noCountUp) => {
      browserDigitsWiderThanCurrency.currency = "eur"
      render(<Fiat amount={1234.56} forceCurrency="eur" isBalance noCountUp={noCountUp} />)

      expect(await screen.findByText("€1,235")).toBeTruthy()
    }
  )
})
