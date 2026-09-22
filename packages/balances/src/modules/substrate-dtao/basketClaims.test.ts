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

type PreviewFixture = { hotkey: string; accrued_tao: bigint; redeemable_tao: bigint }

const preview = (hotkey: string, redeemableTao: bigint, accruedTao = redeemableTao) => ({
  hotkey,
  accrued_tao: accruedTao,
  redeemable_tao: redeemableTao,
})

const mockRuntimeCalls = (previewsByAddress: Record<string, PreviewFixture[]>) => {
  vi.mocked(fetchRuntimeCallResult).mockImplementation(
    async (_connector, _networkId, _builder, _apiName, method, args) => {
      if (method === "get_root_basket_claim_previews")
        return previewsByAddress[args[0] as string] ?? []
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

  it("attributes redeemable payouts per validator hotkey and skips zero payouts", async () => {
    mockRuntimeCalls({
      "address-1": [preview("hotkey-1", 30n), preview("hotkey-2", 0n)],
    })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([{ address: "address-1", hotkey: "hotkey-1", amount: 30n }])
  })

  it("reports the redeemable amount, not the full accrued entitlement", async () => {
    // spec 468 dust rules: the chain pays redeemable_tao (entitlement minus dust rows) and
    // compares that figure to the claim threshold, so accrued_tao overstates the payout
    mockRuntimeCalls({ "address-1": [preview("hotkey-1", 30n, 45n)] })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([{ address: "address-1", hotkey: "hotkey-1", amount: 30n }])
  })

  it("skips an entitlement made only of dust rows", async () => {
    // accrued but nothing redeemable: a claim would be a paid no-op
    mockRuntimeCalls({ "address-1": [preview("hotkey-1", 0n, 45n)] })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([])
  })

  it("reports positions on validators the coldkey no longer stakes to", async () => {
    // the chain keeps basket entitlement (and its coldkey→hotkeys index entry) after a
    // full unstake: the previews call must be the source of truth, not stake records
    mockRuntimeCalls({ "address-1": [preview("unstaked-hotkey", 25n)] })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([{ address: "address-1", hotkey: "unstaked-hotkey", amount: 25n }])
  })

  it("reads entitlement from the previews call only", async () => {
    // reconciling against the coldkey-wide get_root_basket_owed total fabricated claims:
    // both are marked NAV quotes that move every block, so a total read from another block
    // than the previews leaves a residue with no validator to claim it from
    mockRuntimeCalls({ "address-1": [preview("hotkey-1", 60n)] })

    const claims = await fetchBasketClaims(CONNECTOR, "bittensor", "0x00", ["address-1"])

    expect(claims).toEqual([{ address: "address-1", hotkey: "hotkey-1", amount: 60n }])
    expect(fetchRuntimeCallResult).toHaveBeenCalledTimes(1)
    expect(fetchRuntimeCallResult).toHaveBeenCalledWith(
      CONNECTOR,
      "bittensor",
      expect.anything(),
      "BetaBasketRuntimeApi",
      "get_root_basket_claim_previews",
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
      "get_root_basket_claim_previews",
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
