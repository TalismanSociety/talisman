import type { SubGammaToken } from "@talismn/chaindata-provider"
import { render, screen, waitFor } from "@testing-library/react"
import BigNumber from "bignumber.js"
import { describe, expect, it, vi } from "vitest"

import { Statistics } from "../Statistics"

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

vi.mock("@ui/state/settings", () => ({
  useSelectedCurrency: () => "usd",
  useSetting: () => ["usd", () => {}],
  useSettingValue: () => false,
}))
vi.mock("@ui/hooks/useFavoriteCurrencies", () => ({ useFavoriteCurrencies: () => [["usd"]] }))
vi.mock("@ui/state/tokenRates", () => ({
  useTokenRates: () => ({ usd: { price: 250 } }),
}))
vi.mock("@ui/state/fiatFromUsd", () => ({ useFiatFromUsd: (usd: number) => usd }))

describe("Statistics", () => {
  it("shows the face value of gamma credits, which have no fiat price", async () => {
    render(
      <Statistics
        title="Credits"
        tokens={BigNumber("466.5")}
        fiat={null}
        token={token}
        showTokens
        align="right"
      />
    )

    await waitFor(() =>
      expect(screen.getByText(/face value/).textContent?.replaceAll("\u200E", "")).toBe(
        "≈ $466.50 face value"
      )
    )
  })
})
