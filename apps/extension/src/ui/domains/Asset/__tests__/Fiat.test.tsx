import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { Fiat } from "../Fiat"

vi.mock("@ui/state/settings", () => ({
  useSelectedCurrency: () => "usd",
  useSettingValue: () => false,
}))

vi.mock("@ui/state/fiatFromUsd", () => ({
  useFiatFromUsd: (amount: number) => amount,
}))

describe("Fiat balance", () => {
  test.each([
    [19329819.44, "vnd", "₫19,329,819"],
    [115001.4, "jpy", "¥115,001"],
    [1234.5, "usd", "$1,234.50"],
    [0.0123456, "btc", "₿0.012346"],
  ] as const)("animates %s %s to %s", async (amount, currency, expected) => {
    render(<Fiat amount={amount} forceCurrency={currency} isBalance />)

    expect(await screen.findByText(expected)).toBeTruthy()
  })

  test.each([
    [0.4, "vnd", "< ₫1"],
    [0.004, "usd", "< $0.01"],
    [0.0000004, "btc", "< ₿0.000001"],
  ] as const)("shows %s %s below its smallest unit as %s", async (amount, currency, expected) => {
    render(<Fiat amount={amount} forceCurrency={currency} isBalance />)

    expect(await screen.findByText(expected)).toBeTruthy()
  })
})
