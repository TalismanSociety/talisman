import { describe, expect, it, vi } from "vitest"

import { hasStorageItems } from "../shared"
import { fetchRpcQueryPack } from "../shared/rpcQueryPack"
import { fetchRootStakeHolds } from "./rootStakeHold"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock("../shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared")>()),
  hasStorageItems: vi.fn(() => true),
}))

vi.mock("../shared/parseMetadataRpcCached", () => ({
  parseMetadataRpcCached: vi.fn(() => ({
    builder: { buildStorage: vi.fn(() => ({ keys: { enc: vi.fn(() => "0xkey") } })) },
    unifiedMetadata: {},
  })),
}))

vi.mock("../shared/rpcQueryPack", () => ({
  fetchRpcQueryPack: vi.fn(),
}))

const PAIRS = [
  { address: "address-1", hotkey: "hotkey-1" },
  { address: "address-1", hotkey: "hotkey-2" },
  { address: "address-2", hotkey: "hotkey-1" },
]

const makeConnector = (currentBlock = 1000) =>
  ({
    send: vi.fn(async (_networkId: string, method: string) => {
      if (method === "chain_getHeader") return { number: `0x${currentBlock.toString(16)}` }
      throw new Error(`unexpected rpc method ${method}`)
    }),
  }) as unknown as Parameters<typeof fetchRootStakeHolds>[0]

describe("fetchRootStakeHolds", () => {
  it("returns nothing when the storage items are missing (old minimetadata or pre-441 chain)", async () => {
    vi.mocked(hasStorageItems).mockReturnValueOnce(false)

    const holds = await fetchRootStakeHolds(makeConnector(), "bittensor", "0x00", PAIRS)

    expect(holds).toEqual([])
    expect(fetchRpcQueryPack).not.toHaveBeenCalled()
  })

  it("skips the per-pair queries entirely while the interval is 0 (disabled, the default)", async () => {
    vi.mocked(fetchRpcQueryPack).mockClear()
    vi.mocked(fetchRpcQueryPack).mockResolvedValueOnce([0n])

    const holds = await fetchRootStakeHolds(makeConnector(), "bittensor", "0x00", PAIRS)

    expect(holds).toEqual([])
    expect(fetchRpcQueryPack).toHaveBeenCalledTimes(1)
  })

  it("computes unlock blocks and omits pairs already past their window or without history", async () => {
    vi.mocked(fetchRpcQueryPack).mockClear()
    vi.mocked(fetchRpcQueryPack)
      .mockResolvedValueOnce([100n]) // RootStakeUnlockInterval
      .mockResolvedValueOnce([
        // still inside the window: 950 + 100 = 1050 > 1000
        { address: "address-1", hotkey: "hotkey-1", lastStakeBlock: 950n },
        // window passed: 850 + 100 = 950 <= 1000
        { address: "address-1", hotkey: "hotkey-2", lastStakeBlock: 850n },
        // no recorded root stake op for the pair
        { address: "address-2", hotkey: "hotkey-1", lastStakeBlock: 0n },
      ])

    const holds = await fetchRootStakeHolds(makeConnector(1000), "bittensor", "0x00", PAIRS)

    expect(holds).toEqual([{ address: "address-1", hotkey: "hotkey-1", unlockAtBlock: 1050 }])
  })

  it("rejects on transient failures instead of resolving empty", async () => {
    // a missing hold reads as "free to unstake" — failures must reject so the poll fails
    // and balances go stale instead of silently dropping an active hold
    vi.mocked(fetchRpcQueryPack).mockRejectedValueOnce(new Error("rpc down"))

    await expect(fetchRootStakeHolds(makeConnector(), "bittensor", "0x00", PAIRS)).rejects.toThrow(
      "rpc down"
    )
  })

  it("rejects when the current block cannot be fetched", async () => {
    vi.mocked(fetchRpcQueryPack)
      .mockResolvedValueOnce([100n])
      .mockResolvedValueOnce([{ address: "address-1", hotkey: "hotkey-1", lastStakeBlock: 950n }])
    const connector = {
      send: vi.fn(async () => null),
    } as unknown as Parameters<typeof fetchRootStakeHolds>[0]

    await expect(fetchRootStakeHolds(connector, "bittensor", "0x00", PAIRS)).rejects.toThrow(
      "Failed to fetch current block number"
    )
  })
})
