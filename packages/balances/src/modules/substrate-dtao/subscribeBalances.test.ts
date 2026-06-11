import { firstValueFrom } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { fetchBalances } from "./fetchBalances"
import { subscribeBalances } from "./subscribeBalances"

vi.mock("../../log", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("./fetchBalances", () => ({
  fetchBalances: vi.fn(),
}))

const makeToken = (id: string) =>
  ({
    id,
    type: "substrate-dtao",
    platform: "polkadot",
  }) as TokensWithAddresses[number][0]

describe("substrate-dtao subscribeBalances", () => {
  beforeEach(() => {
    vi.mocked(fetchBalances).mockReset()
  })

  it("emits per-balance errors when a poll throws", async () => {
    const fetchError = new Error("rpc failed")
    const tokensWithAddresses: TokensWithAddresses = [
      [makeToken("token-1"), ["address-1", "address-2"]],
      [makeToken("token-2"), ["address-3"]],
    ]

    vi.mocked(fetchBalances).mockRejectedValueOnce(fetchError)

    const result = await firstValueFrom(
      subscribeBalances({
        networkId: "bittensor",
        tokensWithAddresses,
        connector: {},
        miniMetadata: null,
      } as Parameters<typeof subscribeBalances>[0])
    )

    expect(result).toEqual({
      success: [],
      errors: [
        { tokenId: "token-1", address: "address-1", error: fetchError },
        { tokenId: "token-1", address: "address-2", error: fetchError },
        { tokenId: "token-2", address: "address-3", error: fetchError },
      ],
    })
  })
})
