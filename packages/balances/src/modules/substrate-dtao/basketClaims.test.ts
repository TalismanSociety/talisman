import { beforeEach, describe, expect, it, vi } from "vitest"

import { fetchRuntimeCallResult, hasRuntimeApi } from "../shared"
import {
  CLAIMABLE_REWARDS_LABEL,
  fetchBasketClaims,
  findDTaoClaimablePlancks,
  getDTaoClaimablePlancks,
  ROOT_NETUID,
} from "./basketClaims"

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
  positionsByAddress: Record<string, Array<[hotkey: string, owedShares: bigint, payoutTao: bigint]>>
) => {
  vi.mocked(fetchRuntimeCallResult).mockImplementation(
    async (_connector, _networkId, _builder, _apiName, method, args) => {
      if (method === "get_root_basket_positions") return positionsByAddress[args[0] as string] ?? []
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

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([])
    expect(fetchRuntimeCallResult).not.toHaveBeenCalled()
  })

  it("attributes payouts per validator hotkey and skips zero payouts", async () => {
    mockRuntimeCalls({
      "address-1": [
        ["hotkey-1", 10n, 30n],
        ["hotkey-2", 5n, 0n],
      ],
    })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([{ address: "address-1", hotkey: "hotkey-1", amount: 30n }])
  })

  it("reports positions on validators the coldkey no longer stakes to", async () => {
    // the chain keeps basket entitlement (and its coldkey→hotkeys index entry) after a
    // full unstake: the positions call must be the source of truth, not stake records
    mockRuntimeCalls({ "address-1": [["unstaked-hotkey", 10n, 25n]] })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([{ address: "address-1", hotkey: "unstaked-hotkey", amount: 25n }])
  })

  it("reads entitlement from the positions call only", async () => {
    // reconciling against the coldkey-wide get_root_basket_owed total fabricated claims:
    // both are marked NAV quotes that move every block, so a total read from another block
    // than the positions leaves a residue with no validator to claim it from
    mockRuntimeCalls({ "address-1": [["hotkey-1", 10n, 60n]] })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([{ address: "address-1", hotkey: "hotkey-1", amount: 60n }])
    expect(fetchRuntimeCallResult).toHaveBeenCalledTimes(1)
    expect(fetchRuntimeCallResult).toHaveBeenCalledWith(
      CONNECTOR,
      "bittensor",
      expect.anything(),
      "BetaBasketRuntimeApi",
      "get_root_basket_positions",
      ["address-1"],
      undefined
    )
  })

  it("pins the query to the requested block", async () => {
    mockRuntimeCalls({ "address-1": [] })

    await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"], "0xblockhash")

    expect(fetchRuntimeCallResult).toHaveBeenCalledWith(
      CONNECTOR,
      "bittensor",
      expect.anything(),
      "BetaBasketRuntimeApi",
      "get_root_basket_positions",
      ["address-1"],
      "0xblockhash"
    )
  })

  it("rejects on transient failures instead of resolving empty", async () => {
    // an empty result reads as "nothing claimable" and deletes claim-only balances for
    // the poll — failures must reject so the poll fails and balances go stale instead
    vi.mocked(fetchRuntimeCallResult).mockRejectedValue(new Error("rpc down"))

    await expect(fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])).rejects.toThrow(
      "rpc down"
    )
  })
})

describe("getDTaoClaimablePlancks", () => {
  it("sums claimable-rewards locks and ignores the others", () => {
    const locks = [
      { label: CLAIMABLE_REWARDS_LABEL, amount: { planck: 100n } },
      { label: "Decaying Conviction Lock", amount: { planck: 500n } },
      { label: CLAIMABLE_REWARDS_LABEL, amount: { planck: 25n } },
    ]

    expect(getDTaoClaimablePlancks(locks)).toBe(125n)
    expect(getDTaoClaimablePlancks([])).toBe(0n)
    expect(getDTaoClaimablePlancks(null)).toBe(0n)
  })
})

describe("findDTaoClaimablePlancks", () => {
  const NETWORK_ID = "bittensor"
  const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
  const HOTKEY_1 = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"
  const HOTKEY_2 = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw"

  const TARGET = { networkId: NETWORK_ID, address: ALICE, hotkey: HOTKEY_1 }

  const makeClaimBalance = (
    address: string,
    hotkey: string,
    claimablePlancks: bigint,
    netuid = ROOT_NETUID
  ) => ({
    address,
    token: { type: "substrate-dtao", networkId: NETWORK_ID, netuid, hotkey },
    locks: [{ label: CLAIMABLE_REWARDS_LABEL, amount: { planck: claimablePlancks } }],
  })

  it("returns the rewards of the requested (address, hotkey) pair", () => {
    const balances = [
      makeClaimBalance(ALICE, HOTKEY_1, 100n),
      makeClaimBalance(BOB, HOTKEY_2, 900n),
    ]

    expect(findDTaoClaimablePlancks(balances, TARGET)).toBe(100n)
  })

  it("returns null when the requested entitlement is gone, even if other claims remain", () => {
    const balances = [makeClaimBalance(BOB, HOTKEY_2, 900n)]

    expect(findDTaoClaimablePlancks(balances, TARGET)).toBeNull()
  })

  it("returns null when the requested pair's rewards drop to zero", () => {
    const balances = [makeClaimBalance(ALICE, HOTKEY_1, 0n), makeClaimBalance(BOB, HOTKEY_2, 900n)]

    expect(findDTaoClaimablePlancks(balances, TARGET)).toBeNull()
  })

  it("ignores subnet positions: only root carries basket entitlements", () => {
    const balances = [makeClaimBalance(ALICE, HOTKEY_1, 100n, 45)]

    expect(findDTaoClaimablePlancks(balances, TARGET)).toBeNull()
  })
})
