import { Balances } from "@talismn/balances"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { makeBalance, makeToken } from "../domains/Asset/__tests__/tokenPickerFixtures"

const HELD = makeToken("held", "TAO")
const OTHER_HELD = makeToken("other-held", "DOT")
const NOT_HELD = makeToken("not-held", "ξ")

const sendFundsOpen = vi.hoisted(() => vi.fn())
vi.mock("@ui/api", () => ({ api: { sendFundsOpen } }))
vi.mock("@ui/state/accounts", () => ({ useAccounts: () => [{ address: "account" }] }))
vi.mock("@ui/state/balances", () => ({
  useBalances: () => new Balances([makeBalance(HELD, 1), makeBalance(OTHER_HELD, 1)]),
}))
vi.mock("@ui/state/chaindata", () => ({ useToken: () => null }))

import { useSendFundsPopup } from "./useSendFundsPopup"

const renderPopup = (tokenIds?: string[]) =>
  renderHook(() => useSendFundsPopup("token_details", undefined, undefined, tokenIds)).result
    .current

describe("useSendFundsPopup", () => {
  beforeEach(() => vi.clearAllMocks())

  it("opens the wizard with the given tokens", () => {
    const tokenIds = [HELD.id, NOT_HELD.id]

    renderPopup(tokenIds).openSendFundsPopup()

    expect(sendFundsOpen).toHaveBeenCalledExactlyOnceWith({
      entry: "token_details",
      from: undefined,
      tokenId: undefined,
      tokenIds,
      to: undefined,
    })
  })

  it("cannot send when none of the given tokens has a transferable balance", () => {
    const { canSendFunds, cannotSendFundsReason } = renderPopup([NOT_HELD.id])

    expect(canSendFunds).toBe(false)
    expect(cannotSendFundsReason).toBe("No tokens available to send")
  })

  it("cannot send when no tokens are given by an asset page showing none", () => {
    expect(renderPopup([]).canSendFunds).toBe(false)
  })

  it("can send without a token restriction", () => {
    expect(renderPopup().canSendFunds).toBe(true)
  })
})
