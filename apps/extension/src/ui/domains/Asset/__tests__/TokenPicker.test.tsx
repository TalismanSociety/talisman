import { Balance, type BalanceJson, Balances } from "@talismn/balances"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TokenPicker } from "../TokenPicker"
import { makeBalance, makeToken } from "./tokenPickerFixtures"

const ADDRESS = "account"

const dot = makeToken("polkadot", "DOT")

const reservedOnly = new Balance(
  {
    source: "test-source",
    status: "live",
    networkId: dot.networkId,
    address: ADDRESS,
    tokenId: dot.id,
    values: [{ type: "reserved", label: "staked", amount: "50000000000" }],
  } as BalanceJson,
  { tokens: { [dot.id]: dot } }
)

const mockBalances = vi.fn<() => Balances>()

vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: () => undefined,
  useAccounts: () => [],
}))

vi.mock("@ui/state/balances", () => ({
  useBalances: () => mockBalances(),
  useIsBalanceInitializing: () => false,
}))

vi.mock("@ui/state/chaindata", () => ({
  useTokens: () => [dot],
  useNetworksMapById: () => ({ [dot.networkId]: { id: dot.networkId, name: "Polkadot" } }),
}))

vi.mock("@ui/state/settings", () => ({ useSelectedCurrency: () => "usd" }))

vi.mock("@ui/domains/Asset/Fiat", () => ({ Fiat: () => null }))
vi.mock("@ui/domains/Asset/NetworkFilterPicker", () => ({ NetworkFilterPicker: () => null }))
vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))
vi.mock("@ui/domains/Asset/Tokens", () => ({ Tokens: () => null }))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkName", () => ({ NetworkName: () => null }))
vi.mock("@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName", () => ({
  BittensorValidatorName: () => null,
}))

const NO_BALANCES_MESSAGE = "There are no tokens with balances in this account"
const NO_MATCH_MESSAGE = "No token matches your search"

const renderPicker = (props: { address?: string; initialSearch?: string } = {}) =>
  render(<TokenPicker tokenScope="all" {...props} />)

describe("TokenPicker empty list", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    mockBalances.mockReturnValue(new Balances([]))
  })

  it("says the account holds no tokens when it has no balances", () => {
    renderPicker({ address: ADDRESS })

    expect(screen.getByText(NO_BALANCES_MESSAGE)).toBeTruthy()
  })

  it("says the account holds no tokens when none of its balances can be sent", () => {
    mockBalances.mockReturnValue(new Balances([reservedOnly]))

    renderPicker({ address: ADDRESS })

    expect(screen.getByText(NO_BALANCES_MESSAGE)).toBeTruthy()
    expect(screen.queryByText(NO_MATCH_MESSAGE)).toBeNull()
  })

  it("ignores a search of only spaces", () => {
    renderPicker({ address: ADDRESS, initialSearch: "   " })

    expect(screen.getByText(NO_BALANCES_MESSAGE)).toBeTruthy()
  })

  it("says no token matches once the user searches", async () => {
    mockBalances.mockReturnValue(new Balances([reservedOnly]))
    renderPicker({ address: ADDRESS })

    fireEvent.change(screen.getByPlaceholderText("Search by token or network name"), {
      target: { value: "dot" },
    })

    expect(await screen.findByText(NO_MATCH_MESSAGE)).toBeTruthy()
  })

  it("says no token matches a search that excludes every funded token", () => {
    mockBalances.mockReturnValue(new Balances([makeBalance(dot, 5, { address: ADDRESS })]))

    renderPicker({ address: ADDRESS, initialSearch: "ksm" })

    expect(screen.getByText(NO_MATCH_MESSAGE)).toBeTruthy()
  })

  it("says no tokens were found when no account is picked", () => {
    renderPicker()

    expect(screen.getByText("No tokens found")).toBeTruthy()
  })
})
