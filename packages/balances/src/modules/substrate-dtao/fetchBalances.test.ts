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

const mockRuntimeCalls = ({ owed, payout }: { owed: bigint; payout: bigint }) => {
  vi.mocked(fetchRuntimeCallResult).mockImplementation(
    async (_connector, _networkId, _builder, _apiName, method) => {
      if (method === "get_stake_info_for_coldkeys")
        return [[ADDRESS, [{ netuid: 0, hotkey: HOTKEY, stake: 100n }]]]
      if (method === "get_root_basket_owed") return owed
      if (method === "get_root_basket_positions") return payout > 0n ? [[HOTKEY, 1n, payout]] : []
      throw new Error(`unexpected runtime call ${method}`)
    }
  )
}

// state_getKeysPaged (conviction lock scan) finds no keys; chain_getHeader reports the block
const makeConnector = (currentBlock = 1000) => ({
  send: vi.fn(async (_networkId: string, method: string) => {
    if (method === "chain_getHeader") return { number: `0x${currentBlock.toString(16)}` }
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
    mockRuntimeCalls({ owed: 50n, payout: 50n })
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

  it("surfaces the unattributed remainder on the root base token", async () => {
    mockMetadata()
    mockRuntimeCalls({ owed: 80n, payout: 50n })
    vi.mocked(fetchRpcQueryPack).mockResolvedValue([0n])

    // the position token is requested too so its balance row does not trigger
    // dynamic-token registration (out of scope here)
    const result = await runFetchBalances([subDTaoTokenId(NETWORK_ID, 0), ROOT_POSITION_TOKEN_ID])

    expect(result.errors).toEqual([])
    const baseTokenBalance = result.success.find(
      (balance) => balance.tokenId === subDTaoTokenId(NETWORK_ID, 0)
    )
    expect(baseTokenBalance?.values).toContainEqual(
      expect.objectContaining({ type: "locked", label: "Claimable rewards", amount: "30" })
    )
  })
})

describe("fetchBalances root stake hold", () => {
  it("attaches the hold meta to the position's free value while the window runs", async () => {
    mockMetadata()
    mockRuntimeCalls({ owed: 0n, payout: 0n })
    vi.mocked(fetchRpcQueryPack)
      .mockResolvedValueOnce([100n]) // RootStakeUnlockInterval
      .mockResolvedValueOnce([{ address: ADDRESS, hotkey: HOTKEY, lastStakeBlock: 950n }])

    const result = await runFetchBalances([ROOT_POSITION_TOKEN_ID], makeConnector(1000))

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
})
