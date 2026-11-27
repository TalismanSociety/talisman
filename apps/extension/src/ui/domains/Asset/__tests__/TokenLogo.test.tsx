import type { SubGammaToken } from "@talismn/chaindata-provider"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TokenLogo } from "../TokenLogo"

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

vi.mock("@ui/state/chaindata", () => ({ useToken: () => token }))

describe("TokenLogo", () => {
  it("names the gamma badge for screen readers and keeps its glyph out of the text", () => {
    const { container } = render(<TokenLogo tokenId={token.id} />)

    expect(screen.getByRole("img", { name: "Gamma credits" })).toBeTruthy()
    expect(container.textContent).toBe("")
  })
})
