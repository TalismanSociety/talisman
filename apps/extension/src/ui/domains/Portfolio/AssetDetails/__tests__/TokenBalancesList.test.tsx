import { Balance, type BalanceJson, Balances } from "@talismn/balances"
import type { Network, SubGammaToken } from "@talismn/chaindata-provider"
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TokenBalances } from "../DashboardTokenBalances"
import { PopupTokenBalances } from "../PopupTokenBalances"

const ADDRESS = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const OPEN_HOTKEY = "5ExmGpYdT5fK5TAuj3FtGRzKz8ff7BnMjBGudMe3mxUokHns"
const PAUSED_HOTKEY = "5DbyUgUAG9pNHUUB4QePh7mJmuuUE1aLaFJrvuMpVxJCP5Ck"

const network = { id: "bittensor", name: "Bittensor", platform: "polkadot" } as Network

const token: SubGammaToken = {
  id: "bittensor:substrate-gamma:53",
  type: "substrate-gamma",
  platform: "polkadot",
  networkId: "bittensor",
  netuid: 53,
  subnetName: "engy",
  symbol: "γSN53",
  name: "SN53 engy credits",
  decimals: 9,
  isDefault: true,
  isTransferable: false,
}

const deposit = (
  hotkey: string,
  balance: string,
  spendable: string,
  dailySpendCap: string | null
) => ({
  type: "reserved",
  label: `gamma-deposit:${hotkey}`,
  amount: balance,
  meta: { type: "gamma-deposit", hotkey, spendable, dailySpendCap },
})

const balances = new Balances([
  new Balance(
    {
      source: "substrate-gamma",
      status: "live",
      networkId: "bittensor",
      address: ADDRESS,
      tokenId: token.id,
      values: [
        deposit(OPEN_HOTKEY, "154770370", "154770370", null),
        deposit(PAUSED_HOTKEY, "2000000000", "0", "0"),
      ],
    } as BalanceJson,
    { tokens: { [token.id]: token } }
  ),
])

vi.mock("@ui/state/chaindata", () => ({
  useToken: () => token,
  useNetworkById: () => network,
  useTokensMap: () => ({ [token.id]: token }),
  useNetworksMapById: () => ({ [network.id]: network }),
}))
vi.mock("@ui/state/settings", () => ({
  useSelectedCurrency: () => "usd",
  useSettingValue: () => false,
}))
vi.mock("@ui/state/tokenRates", () => ({
  useTokenRates: () => ({ usd: { price: 250 } }),
}))
vi.mock("@ui/state/fiatFromUsd", () => ({ useFiatFromUsd: (usd: number) => usd }))
vi.mock("@ui/state/bittensor", () => ({
  useBittensorValidator: () => ({ status: "loaded", data: null }),
}))
vi.mock("@ui/domains/Portfolio/usePortfolioNavigation", () => ({
  usePortfolioNavigation: () => ({ selectedAccount: { address: ADDRESS } }),
}))

vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkName", () => ({ NetworkName: () => null }))
vi.mock("@ui/domains/Staking/Bond/BondButton", () => ({ BondButton: () => null }))
vi.mock("@ui/domains/Staking/Bittensor/components/BittensorHotkeyAvatar", () => ({
  BittensorHotkeyAvatar: () => null,
}))
vi.mock("../BittensorUnstakeButton", () => ({ BittensorUnstakeButton: () => null }))
vi.mock("../CopyAddressButton", () => ({ CopyAddressButton: () => null }))
vi.mock("../SendFundsTokenButton", () => ({ SendFundsTokenButton: () => null }))
vi.mock("../TokenContextMenu", () => ({ TokenContextMenu: () => null }))
vi.mock("../DashboardTokenBalances/LockedExtra", () => ({ LockedExtra: () => null }))
vi.mock("../PopupTokenBalances/LockedExtra", () => ({ LockedExtra: () => null }))

const textOf = (element: HTMLElement) => element.textContent?.replaceAll("\u200E", "")

const rowTextOf = (hotkey: string) => {
  let row = screen.getByText(hotkey)
  while (!row.textContent?.includes("Spendable") && row.parentElement) row = row.parentElement
  return textOf(row)
}

const ROW_FACE_VALUES = ["≈ $2.00 face value", "≈ $0.15 face value"]

describe.each([
  ["dashboard", TokenBalances, ["≈ $2.15 face value", ...ROW_FACE_VALUES]],
  ["popup", PopupTokenBalances, ROW_FACE_VALUES],
])("%s TokenBalancesList for gamma credits", (_, View, faceValues) => {
  it("lists one row per deposit with its API key, spendable amount and cap", async () => {
    render(<View tokenId={token.id} balances={balances} />)

    const pausedRow = rowTextOf("5DbyUg…JCP5Ck")
    expect(pausedRow).toContain("Spendable 0 γSN53")
    expect(pausedRow).toContain("Paused")
    expect(pausedRow).not.toContain("No cap")

    const openRow = rowTextOf("5ExmGp…UokHns")
    expect(openRow).toContain("Spendable 0.1548 γSN53")
    expect(openRow).toContain("No cap")
    expect(openRow).not.toContain("Paused")

    await waitFor(() => expect(screen.getAllByText(/face value/).map(textOf)).toEqual(faceValues))
  })
})
