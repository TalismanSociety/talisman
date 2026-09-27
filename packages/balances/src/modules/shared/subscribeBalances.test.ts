import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FetchBalanceResults, TokensWithAddresses } from "../../types/IBalanceModule"
import { createPollingSubscribeBalances } from "./subscribeBalances"

const tokensWithAddresses = [
  [{ id: "1-evm-native" }, ["0x0000000000000000000000000000000000000001"]],
] as unknown as TokensWithAddresses

const args = { networkId: "1", tokensWithAddresses, connector: {} } as never

const result = (free: string): FetchBalanceResults => ({
  success: [
    {
      address: "0x0000000000000000000000000000000000000001",
      tokenId: "1-evm-native",
      networkId: "1",
      source: "evm-native",
      status: "live",
      value: free,
    },
  ] as FetchBalanceResults["success"],
  errors: [],
})

describe("createPollingSubscribeBalances", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("emits an empty result without polling when there is nothing to fetch", async () => {
    const fetchBalances = vi.fn()
    const subscribe = createPollingSubscribeBalances("evm-native", fetchBalances)
    const next = vi.fn()

    subscribe({ ...(args as object), tokensWithAddresses: [] } as never).subscribe(next)

    expect(next).toHaveBeenCalledWith({ success: [], errors: [] })
    expect(fetchBalances).not.toHaveBeenCalled()
  })

  it("polls every 6 seconds, skips unchanged results and stops on unsubscribe", async () => {
    const fetchBalances = vi
      .fn()
      .mockResolvedValueOnce(result("1"))
      .mockResolvedValueOnce(result("1"))
      .mockResolvedValue(result("2"))
    const subscribe = createPollingSubscribeBalances("evm-native", fetchBalances)
    const next = vi.fn()

    const subscription = subscribe(args).subscribe(next)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchBalances).toHaveBeenCalledTimes(1)
    expect(fetchBalances).toHaveBeenCalledWith(args)
    expect(next).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(6_000)
    expect(fetchBalances).toHaveBeenCalledTimes(2)
    expect(next).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(6_000)
    expect(next).toHaveBeenCalledTimes(2)

    subscription.unsubscribe()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchBalances).toHaveBeenCalledTimes(3)
  })

  it("errors the observable when a fetch throws", async () => {
    const fetchBalances = vi.fn().mockRejectedValue(new Error("rpc down"))
    const subscribe = createPollingSubscribeBalances("evm-native", fetchBalances)
    const error = vi.fn()

    subscribe(args).subscribe({ error })
    await vi.advanceTimersByTimeAsync(0)

    expect(error).toHaveBeenCalledWith(new Error("rpc down"))
  })
})
