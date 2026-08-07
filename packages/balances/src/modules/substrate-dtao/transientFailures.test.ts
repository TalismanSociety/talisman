import { describe, expect, it, vi } from "vitest"

import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"
import { fetchRpcQueryPack } from "../shared/rpcQueryPack"
import { fetchConvictionLocks } from "./convictionLocks"
import { fetchBalances } from "./fetchBalances"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock("../shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared")>()),
  fetchRuntimeCallResult: vi.fn(),
  hasRuntimeApi: vi.fn(() => true),
  hasStorageItems: vi.fn(() => true),
}))

vi.mock("../shared/parseMetadataRpcCached", () => ({
  parseMetadataRpcCached: vi.fn(),
}))

vi.mock("../shared/rpcQueryPack", () => ({
  fetchRpcQueryPack: vi.fn(),
}))

const makeCoder = () => ({
  keys: {
    enc: vi.fn(() => "0xkeyprefix"),
    dec: vi.fn(() => ["address-1", 128, "hotkey-1"]),
  },
  value: { dec: vi.fn() },
})

const makeBuilder = () => ({ buildStorage: vi.fn(() => makeCoder()) })

const mockMetadata = () => {
  vi.mocked(parseMetadataRpcCached).mockReturnValue({
    builder: makeBuilder(),
    unifiedMetadata: {},
  } as unknown as ReturnType<typeof parseMetadataRpcCached>)
}

// transient RPC failures must reject (the poll fails, the provider marks balances stale)
// instead of resolving empty: an empty result reads as "these balances no longer exist",
// the provider deletes them from storage and the rows flap back in on the next good poll

describe("fetchConvictionLocks transient failures", () => {
  it("rejects when the Lock storage key scan fails", async () => {
    mockMetadata()
    const connector = { send: vi.fn().mockRejectedValue(new Error("rpc down")) }

    await expect(
      fetchConvictionLocks(
        connector as unknown as Parameters<typeof fetchConvictionLocks>[0],
        "bittensor",
        "0x00",
        ["address-1"]
      )
    ).rejects.toThrow("rpc down")
  })

  it("rejects when a returned Lock storage key fails to decode", async () => {
    const coder = {
      keys: {
        enc: vi.fn(() => "0xkeyprefix"),
        dec: vi.fn(() => {
          throw new Error("bad key")
        }),
      },
      value: { dec: vi.fn() },
    }
    vi.mocked(parseMetadataRpcCached).mockReturnValue({
      builder: { buildStorage: vi.fn(() => coder) },
      unifiedMetadata: {},
    } as unknown as ReturnType<typeof parseMetadataRpcCached>)
    const connector = { send: vi.fn().mockResolvedValue(["0xstatekey1"]) }

    await expect(
      fetchConvictionLocks(
        connector as unknown as Parameters<typeof fetchConvictionLocks>[0],
        "bittensor",
        "0x00",
        ["address-1"]
      )
    ).rejects.toThrow("bad key")
  })

  it("rejects when the Lock key prefix encode fails", async () => {
    // an unencodable key prefix (metadata drift) would make the address read as lock-free
    // and delete its lock-only balances — the poll must fail instead
    const lockCoder = {
      keys: {
        enc: vi.fn(() => {
          throw new Error("bad prefix")
        }),
        dec: vi.fn(),
      },
      value: { dec: vi.fn() },
    }
    vi.mocked(parseMetadataRpcCached).mockReturnValue({
      builder: {
        buildStorage: vi.fn((_pallet: string, entry: string) =>
          entry === "Lock" ? lockCoder : makeCoder()
        ),
      },
      unifiedMetadata: {},
    } as unknown as ReturnType<typeof parseMetadataRpcCached>)
    const connector = { send: vi.fn() }

    await expect(
      fetchConvictionLocks(
        connector as unknown as Parameters<typeof fetchConvictionLocks>[0],
        "bittensor",
        "0x00",
        ["address-1"]
      )
    ).rejects.toThrow("bad prefix")
  })

  it("rejects when the DecayingLock key encode fails", async () => {
    // an unencodable DecayingLock key would silently default the pair to "decaying",
    // mislabeling a perpetual lock — the poll must fail instead
    const decayingCoder = {
      keys: {
        enc: vi.fn(() => {
          throw new Error("bad decaying key")
        }),
        dec: vi.fn(),
      },
      value: { dec: vi.fn() },
    }
    vi.mocked(parseMetadataRpcCached).mockReturnValue({
      builder: {
        buildStorage: vi.fn((_pallet: string, entry: string) =>
          entry === "DecayingLock" ? decayingCoder : makeCoder()
        ),
      },
      unifiedMetadata: {},
    } as unknown as ReturnType<typeof parseMetadataRpcCached>)
    const connector = { send: vi.fn().mockResolvedValue(["0xstatekey1"]) }
    vi.mocked(fetchRuntimeCallResult).mockResolvedValue(null)

    await expect(
      fetchConvictionLocks(
        connector as unknown as Parameters<typeof fetchConvictionLocks>[0],
        "bittensor",
        "0x00",
        ["address-1"]
      )
    ).rejects.toThrow("bad decaying key")
  })

  it("rejects when get_coldkey_lock fails", async () => {
    mockMetadata()
    const connector = { send: vi.fn().mockResolvedValue(["0xstatekey1"]) }
    vi.mocked(fetchRpcQueryPack).mockResolvedValue([])
    vi.mocked(fetchRuntimeCallResult).mockRejectedValue(new Error("runtime api failed"))

    await expect(
      fetchConvictionLocks(
        connector as unknown as Parameters<typeof fetchConvictionLocks>[0],
        "bittensor",
        "0x00",
        ["address-1"]
      )
    ).rejects.toThrow("runtime api failed")
  })
})

describe("fetchBalances transient failures", () => {
  it("returns per-balance errors (not empty success) when the basket owed fetch fails", async () => {
    mockMetadata()
    // an empty basket result reads as "nothing claimable" and deletes claim-only balances
    // for this poll — the whole poll must fail (stale balances) instead
    vi.mocked(fetchRuntimeCallResult).mockImplementation(
      async (_connector, _networkId, _builder, _apiName, method) => {
        if (method === "get_stake_info_for_coldkeys")
          return [["address-1", [{ netuid: 0, hotkey: "hotkey-1", stake: 100n }]]]
        throw new Error("rpc down")
      }
    )
    vi.mocked(fetchRpcQueryPack).mockResolvedValue([0n])
    // conviction lock scan finds no keys
    const connector = { send: vi.fn().mockResolvedValue([]) }

    const token = {
      id: "bittensor:substrate-dtao:0:hotkey-1",
      type: "substrate-dtao",
      platform: "polkadot",
      networkId: "bittensor",
      netuid: 0,
    } as unknown as TokensWithAddresses[number][0]

    const result = await fetchBalances({
      networkId: "bittensor",
      tokensWithAddresses: [[token, ["address-1"]]] as TokensWithAddresses,
      connector,
      miniMetadata: { data: "0x00", source: "substrate-dtao", chainId: "bittensor" },
      signal: new AbortController().signal,
    } as unknown as Parameters<typeof fetchBalances>[0])

    expect(result.success).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({ tokenId: token.id, address: "address-1" })
  })
})
