import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const KNOWN_ID = "1:evm-native"
const CUSTOM_ID = "1:evm-erc20:0x3333333333333333333333333333333333333333"

const TOKENS = {
  [KNOWN_ID]: { id: KNOWN_ID, type: "evm-native", networkId: "1", symbol: "ETH", __isKnown: true },
  [CUSTOM_ID]: {
    id: CUSTOM_ID,
    type: "evm-erc20",
    networkId: "1",
    symbol: "MINE",
    __isCustom: true,
  },
}

const PICK = { searched: true, networkFiltered: true, position: 2 }

const track = vi.hoisted(() => vi.fn())
const set = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))
vi.mock("@ui/apps/popup/pages/SendFunds/context", () => ({
  useSendFundsWizard: () => ({ tokenSymbol: "ETH", set }),
}))
vi.mock("@ui/state/chaindata", () => ({
  useTokensMap: () => TOKENS,
  useNetworksMapById: () => ({ "1": { id: "1", __isKnown: true } }),
}))
vi.mock("@ui/domains/Asset/TokenPicker", () => ({
  TokenPicker: ({ onSelect }: { onSelect: (tokenId: string, pick: typeof PICK) => void }) =>
    Object.values(TOKENS).map((token) => (
      <button key={token.id} type="button" onClick={() => onSelect(token.id, PICK)}>
        {token.symbol}
      </button>
    )),
}))

import { SendFundsTokenPicker } from "./SendFundsTokenPicker"

describe("SendFundsTokenPicker", () => {
  beforeEach(() => vi.clearAllMocks())

  it("tracks the pick and moves on with the token", () => {
    render(<SendFundsTokenPicker />)

    fireEvent.click(screen.getByText("ETH"))

    expect(track).toHaveBeenCalledExactlyOnceWith("send_token_selected", {
      searched: true,
      network_filtered: true,
      position: 2,
      token_id: KNOWN_ID,
      symbol: "ETH",
      network_id: "1",
    })
    expect(set).toHaveBeenCalledExactlyOnceWith("tokenId", KNOWN_ID, true)
  })

  it("reports a token the user added without its id or symbol", () => {
    render(<SendFundsTokenPicker />)

    fireEvent.click(screen.getByText("MINE"))

    expect(track).toHaveBeenCalledExactlyOnceWith(
      "send_token_selected",
      expect.objectContaining({ token_id: "custom", symbol: "unknown" })
    )
  })
})
