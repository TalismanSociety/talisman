import { firstValueFrom } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { fetchBestBlockHash } from "../shared"
import { fetchBalancesAt } from "./fetchBalances"
import { subscribeBalances } from "./subscribeBalances"

vi.mock("../../log", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("./fetchBalances", () => ({
  fetchBalancesAt: vi.fn(),
}))

vi.mock("../shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared")>()),
  fetchBestBlockHash: vi.fn(),
}))

const makeToken = (id: string) =>
  ({
    id,
    type: "substrate-dtao",
    platform: "polkadot",
  }) as TokensWithAddresses[number][0]

const subscribe = (tokensWithAddresses: TokensWithAddresses) =>
  subscribeBalances({
    networkId: "bittensor",
    tokensWithAddresses,
    connector: {},
    miniMetadata: null,
  } as unknown as Parameters<typeof subscribeBalances>[0])

describe("substrate-dtao subscribeBalances", () => {
  beforeEach(() => {
    vi.mocked(fetchBalancesAt).mockReset()
    vi.mocked(fetchBestBlockHash).mockReset()
    vi.mocked(fetchBestBlockHash).mockResolvedValue("0xblock1")
  })

  it("emits per-balance errors when a poll throws", async () => {
    const fetchError = new Error("rpc failed")
    const tokensWithAddresses: TokensWithAddresses = [
      [makeToken("token-1"), ["address-1", "address-2"]],
      [makeToken("token-2"), ["address-3"]],
    ]

    vi.mocked(fetchBalancesAt).mockRejectedValueOnce(fetchError)

    const result = await firstValueFrom(subscribe(tokensWithAddresses))

    expect(result).toEqual({
      success: [],
      errors: [
        { tokenId: "token-1", address: "address-1", error: fetchError },
        { tokenId: "token-1", address: "address-2", error: fetchError },
        { tokenId: "token-2", address: "address-3", error: fetchError },
      ],
    })
  })

  describe("polling", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    const TOKENS: TokensWithAddresses = [[makeToken("token-1"), ["address-1"]]]

    it("reads the balances once per block", async () => {
      vi.mocked(fetchBalancesAt).mockResolvedValue({ success: [], errors: [] })
      const subscription = subscribe(TOKENS).subscribe()

      await vi.advanceTimersByTimeAsync(0)
      expect(fetchBalancesAt).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fetchBalancesAt).mock.calls[0]?.[1]).toBe("0xblock1")

      // the next poll finds the same best block
      await vi.advanceTimersByTimeAsync(6_000)
      expect(fetchBestBlockHash).toHaveBeenCalledTimes(2)
      expect(fetchBalancesAt).toHaveBeenCalledTimes(1)

      vi.mocked(fetchBestBlockHash).mockResolvedValue("0xblock2")
      await vi.advanceTimersByTimeAsync(6_000)
      expect(fetchBalancesAt).toHaveBeenCalledTimes(2)
      expect(vi.mocked(fetchBalancesAt).mock.calls[1]?.[1]).toBe("0xblock2")

      subscription.unsubscribe()
    })

    it("reads a block again after a poll of it failed", async () => {
      vi.mocked(fetchBalancesAt).mockResolvedValueOnce({
        success: [],
        errors: [{ tokenId: "token-1", address: "address-1", error: new Error("rpc failed") }],
      })
      vi.mocked(fetchBalancesAt).mockResolvedValue({ success: [], errors: [] })
      const subscription = subscribe(TOKENS).subscribe()

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(6_000)
      expect(fetchBalancesAt).toHaveBeenCalledTimes(2)

      subscription.unsubscribe()
    })
  })
})
