import { beforeEach, describe, expect, it, vi } from "vitest"

import { fetchRuntimeCallResult, hasRuntimeApi } from "../shared"
import { fetchBasketClaims } from "./basketClaims"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock("../shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared")>()),
  fetchRuntimeCallResult: vi.fn(),
  hasRuntimeApi: vi.fn(() => true),
}))

vi.mock("../shared/parseMetadataRpcCached", () => ({
  parseMetadataRpcCached: vi.fn(() => ({ builder: {}, unifiedMetadata: {} })),
}))

const CONNECTOR = {} as Parameters<typeof fetchBasketClaims>[0]

const mockRuntimeCalls = (
  owedByAddress: Record<string, bigint>,
  payoutByPair: Record<string, bigint>
) => {
  vi.mocked(fetchRuntimeCallResult).mockImplementation(
    async (_connector, _networkId, _builder, _apiName, method, args) => {
      if (method === "get_root_basket_owed") return owedByAddress[args[0] as string] ?? 0n
      if (method === "get_basket_payout") return payoutByPair[`${args[0]}:${args[1]}`] ?? 0n
      throw new Error(`unexpected runtime call ${method}`)
    }
  )
}

describe("fetchBasketClaims", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns nothing when the runtime API is missing (old minimetadata or pre-441 chain)", async () => {
    vi.mocked(hasRuntimeApi).mockReturnValueOnce(false)

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"], [])

    expect(claims).toEqual([])
    expect(fetchRuntimeCallResult).not.toHaveBeenCalled()
  })

  it("attributes payouts per validator hotkey and skips zero payouts", async () => {
    mockRuntimeCalls({ "address-1": 30n }, { "hotkey-1:address-1": 30n, "hotkey-2:address-1": 0n })

    const claims = await fetchBasketClaims(
      CONNECTOR,
      "bittensor",
      "0x00",
      ["address-1"],
      [
        { address: "address-1", hotkey: "hotkey-1" },
        { address: "address-1", hotkey: "hotkey-2" },
      ]
    )

    expect(claims).toEqual([{ address: "address-1", hotkey: "hotkey-1", amount: 30n }])
  })

  it("reports entitlement not attributed to any staked validator with a null hotkey", async () => {
    mockRuntimeCalls({ "address-1": 100n }, { "hotkey-1:address-1": 60n })

    const claims = await fetchBasketClaims(
      CONNECTOR,
      "bittensor",
      "0x00",
      ["address-1"],
      [{ address: "address-1", hotkey: "hotkey-1" }]
    )

    expect(claims).toEqual([
      { address: "address-1", hotkey: "hotkey-1", amount: 60n },
      { address: "address-1", hotkey: null, amount: 40n },
    ])
  })

  it("skips per-validator queries for coldkeys that are owed nothing", async () => {
    mockRuntimeCalls({ "address-1": 0n }, {})

    const claims = await fetchBasketClaims(
      CONNECTOR,
      "bittensor",
      "0x00",
      ["address-1"],
      [{ address: "address-1", hotkey: "hotkey-1" }]
    )

    expect(claims).toEqual([])
    expect(fetchRuntimeCallResult).toHaveBeenCalledTimes(1)
  })

  it("rejects on transient failures instead of resolving empty", async () => {
    // an empty result reads as "nothing claimable" and deletes claim-only balances for
    // the poll — failures must reject so the poll fails and balances go stale instead
    vi.mocked(fetchRuntimeCallResult).mockRejectedValue(new Error("rpc down"))

    await expect(
      fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"], [])
    ).rejects.toThrow("rpc down")
  })
})
