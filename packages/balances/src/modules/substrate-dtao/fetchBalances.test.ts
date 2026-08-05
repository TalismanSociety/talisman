import { subDTaoTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"
import { fetchRpcQueryPack } from "../shared/rpcQueryPack"
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

const ADDRESS = "address-1"
const HOTKEY = "hotkey-1"
const NETWORK_ID = "bittensor"
const ROOT_POSITION_TOKEN_ID = subDTaoTokenId(NETWORK_ID, 0, HOTKEY)

const mockMetadata = () => {
  vi.mocked(parseMetadataRpcCached).mockReturnValue({
    builder: { buildStorage: vi.fn(() => ({ keys: { enc: vi.fn(() => "0xkey") } })) },
    unifiedMetadata: {},
  } as unknown as ReturnType<typeof parseMetadataRpcCached>)
}

const BLOCK_HASH = "0xblockhash"

const mockRuntimeCalls = ({ payout }: { payout: bigint }) => {
  vi.mocked(fetchRuntimeCallResult).mockImplementation(
    async (_connector, _networkId, _builder, _apiName, method) => {
      if (method === "get_stake_info_for_coldkeys")
        return [[ADDRESS, [{ netuid: 0, hotkey: HOTKEY, stake: 100n }]]]
      if (method === "get_root_basket_positions") return payout > 0n ? [[HOTKEY, 1n, payout]] : []
      throw new Error(`unexpected runtime call ${method}`)
    }
  )
}

// state_getKeysPaged (conviction lock scan) finds no keys
const makeConnector = () => ({
  send: vi.fn(async (_networkId: string, method: string) => {
    if (method === "chain_getBlockHash") return BLOCK_HASH
    return []
  }),
})

const makeToken = (tokenId: string) =>
  ({
    id: tokenId,
    type: "substrate-dtao",
    platform: "polkadot",
    networkId: NETWORK_ID,
    netuid: 0,
  }) as unknown as TokensWithAddresses[number][0]

const runFetchBalances = (tokenIds: string[], connector = makeConnector()) =>
  fetchBalances({
    networkId: NETWORK_ID,
    tokensWithAddresses: tokenIds.map((tokenId) => [
      makeToken(tokenId),
      [ADDRESS],
    ]) as TokensWithAddresses,
    connector,
    miniMetadata: { data: "0x00", source: "substrate-dtao", chainId: NETWORK_ID },
    signal: new AbortController().signal,
  } as unknown as Parameters<typeof fetchBalances>[0])

describe("fetchBalances basket claims", () => {
  it("emits claimable rewards as a locked value and a total-counting extra", async () => {
    mockMetadata()
    mockRuntimeCalls({ payout: 50n })
    vi.mocked(fetchRpcQueryPack).mockResolvedValue([0n]) // hold interval disabled

    const result = await runFetchBalances([ROOT_POSITION_TOKEN_ID])

    expect(result.errors).toEqual([])
    expect(result.success).toHaveLength(1)
    expect(result.success[0]!.values).toContainEqual(
      expect.objectContaining({ type: "free", label: "Root Staking", amount: "100" })
    )
    expect(result.success[0]!.values).toContainEqual({
      type: "locked",
      label: "Claimable rewards",
      amount: "50",
      includeInTransferable: true,
    })
    expect(result.success[0]!.values).toContainEqual({
      type: "extra",
      label: "Claimable rewards",
      amount: "50",
      includeInTotal: true,
    })
  })

  it("never emits claimable rewards on the validator-less root base token", async () => {
    mockMetadata()
    mockRuntimeCalls({ payout: 50n })
    vi.mocked(fetchRpcQueryPack).mockResolvedValue([0n])

    // the position token is requested too so its balance row does not trigger
    // dynamic-token registration (out of scope here)
    const result = await runFetchBalances([subDTaoTokenId(NETWORK_ID, 0), ROOT_POSITION_TOKEN_ID])

    expect(result.errors).toEqual([])
    const baseTokenBalance = result.success.find(
      (balance) => balance.tokenId === subDTaoTokenId(NETWORK_ID, 0)
    )
    // claims are redeemed per validator, so a claim row with no validator behind it is
    // both unclaimable and (when it comes from mixed-block reads) not real
    expect(baseTokenBalance?.values ?? []).not.toContainEqual(
      expect.objectContaining({ label: "Claimable rewards" })
    )
  })

  it("pins every read of the poll to one block", async () => {
    mockMetadata()
    mockRuntimeCalls({ payout: 50n })
    vi.mocked(fetchRpcQueryPack).mockResolvedValue([0n])

    await runFetchBalances([ROOT_POSITION_TOKEN_ID])

    // claim amounts are NAV quotes that move every block: reads combined with each other
    // must come from the same block, or they report state that never existed
    for (const call of vi.mocked(fetchRuntimeCallResult).mock.calls)
      expect(call[6]).toBe(BLOCK_HASH)
    for (const call of vi.mocked(fetchRpcQueryPack).mock.calls) expect(call[3]).toBe(BLOCK_HASH)
  })
})

describe("fetchBalances root stake hold", () => {
  it("attaches the hold meta to the position's free value while the window runs", async () => {
    mockMetadata()
    mockRuntimeCalls({ payout: 0n })
    vi.mocked(fetchRpcQueryPack)
      .mockResolvedValueOnce([100n]) // RootStakeUnlockInterval
      // System.Number (current block) rides along as the pack's first result
      .mockResolvedValueOnce([1000, { address: ADDRESS, hotkey: HOTKEY, lastStakeBlock: 950n }])

    const result = await runFetchBalances([ROOT_POSITION_TOKEN_ID])

    expect(result.errors).toEqual([])
    expect(result.success).toHaveLength(1)
    expect(result.success[0]!.values).toContainEqual(
      expect.objectContaining({
        type: "free",
        label: "Root Staking",
        amount: "100",
        meta: { rootStakeHold: { type: "root-stake-hold", unlockAtBlock: 1050 } },
      })
    )
  })

  it("keeps a fully-unstaked validator's claim without querying holds for it", async () => {
    mockMetadata()
    vi.mocked(fetchRuntimeCallResult).mockImplementation(
      async (_connector, _networkId, _builder, _apiName, method) => {
        if (method === "get_stake_info_for_coldkeys") return [[ADDRESS, []]]
        if (method === "get_root_basket_positions") return [[HOTKEY, 1n, 50n]]
        throw new Error(`unexpected runtime call ${method}`)
      }
    )
    vi.mocked(fetchRpcQueryPack).mockClear()

    const result = await runFetchBalances([ROOT_POSITION_TOKEN_ID])

    expect(result.errors).toEqual([])
    // hold windows only restrict live root stake: no per-pair queries for unstaked validators
    expect(fetchRpcQueryPack).not.toHaveBeenCalled()
    const values = result.success.flatMap((balance) => balance.values)
    expect(values).toContainEqual(
      expect.objectContaining({ type: "locked", label: "Claimable rewards", amount: "50" })
    )
    expect(
      values.some(
        (value) => (value?.meta as { rootStakeHold?: unknown } | undefined)?.rootStakeHold
      )
    ).toBe(false)
  })
})
