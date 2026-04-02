import { subDTaoTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"
import { ALPHA_PRICE_SCALE } from "./alphaPrice"
import { calculatePendingRootClaimable } from "./calculatePendingRootClaimable"

const NETWORK_ID = "bittensor-0"
const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const HOTKEY = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"

const makeArgs = (overrides: Record<string, unknown> = {}) =>
  ({
    stake: 1_000_000_000n,
    hotkey: HOTKEY,
    address: ADDRESS,
    networkId: NETWORK_ID,
    validatorRootClaimableRate: new Map<number, bigint>(),
    dynamicInfoByNetuid: {},
    alreadyClaimedByNetuid: new Map<number, bigint>(),
    ...overrides,
  }) as unknown as Parameters<typeof calculatePendingRootClaimable>[0]

describe("calculatePendingRootClaimable", () => {
  it("returns empty array when validatorRootClaimableRate is empty", () => {
    const result = calculatePendingRootClaimable(makeArgs())
    expect(result).toEqual([])
  })

  it("skips netuids where claimable rate is 0n", () => {
    const rates = new Map<number, bigint>([
      [1, 0n],
      [2, 0n],
    ])
    const result = calculatePendingRootClaimable(makeArgs({ validatorRootClaimableRate: rates }))
    expect(result).toEqual([])
  })

  it("computes I96F32 math correctly for a single netuid", () => {
    const stake = 1_000_000_000n
    const rate = 1n << 32n // fixed-point 1.0
    const rates = new Map<number, bigint>([[1, rate]])

    const result = calculatePendingRootClaimable(
      makeArgs({ stake, validatorRootClaimableRate: rates })
    )

    // totalClaimable = (stake * rate + (1n << 31n)) >> 32n
    const expectedTotal = (stake * rate + (1n << 31n)) >> 32n
    expect(result).toHaveLength(1)
    expect(result[0]!.pendingRootClaim).toBe(expectedTotal)
  })

  it("subtracts alreadyClaimed from totalClaimable", () => {
    const stake = 2_000_000_000n
    const rate = 1n << 31n // fixed-point 0.5
    const rates = new Map<number, bigint>([[3, rate]])
    const totalClaimable = (stake * rate + (1n << 31n)) >> 32n
    const alreadyClaimed = totalClaimable / 2n
    const claimed = new Map<number, bigint>([[3, alreadyClaimed]])

    const result = calculatePendingRootClaimable(
      makeArgs({
        stake,
        validatorRootClaimableRate: rates,
        alreadyClaimedByNetuid: claimed,
      })
    )

    expect(result[0]!.pendingRootClaim).toBe(totalClaimable - alreadyClaimed)
  })

  it("clamps pendingRootClaim to 0n when alreadyClaimed exceeds totalClaimable", () => {
    const stake = 100n
    const rate = 1n << 30n // small rate
    const rates = new Map<number, bigint>([[1, rate]])
    const claimed = new Map<number, bigint>([[1, 999_999_999_999n]])

    const result = calculatePendingRootClaimable(
      makeArgs({
        stake,
        validatorRootClaimableRate: rates,
        alreadyClaimedByNetuid: claimed,
      })
    )

    expect(result[0]!.pendingRootClaim).toBe(0n)
  })

  it("uses 0n when alreadyClaimed entry is missing for a netuid", () => {
    const stake = 500_000_000n
    const rate = 1n << 32n
    const rates = new Map<number, bigint>([[5, rate]])
    // alreadyClaimedByNetuid is empty — no entry for netuid 5

    const result = calculatePendingRootClaimable(
      makeArgs({ stake, validatorRootClaimableRate: rates })
    )

    const expectedTotal = (stake * rate + (1n << 31n)) >> 32n
    expect(result[0]!.pendingRootClaim).toBe(expectedTotal)
  })

  it("produces multiple results for multiple netuids", () => {
    const rates = new Map<number, bigint>([
      [1, 1n << 32n],
      [2, 1n << 31n],
      [3, 1n << 30n],
    ])

    const result = calculatePendingRootClaimable(makeArgs({ validatorRootClaimableRate: rates }))

    expect(result).toHaveLength(3)
    const netuids = result.map((r) => r.netuid)
    expect(netuids).toEqual(expect.arrayContaining([1, 2, 3]))
  })

  it("sets scaledAlphaPrice to 0n when dynamicInfo is missing", () => {
    const rates = new Map<number, bigint>([[7, 1n << 32n]])

    const result = calculatePendingRootClaimable(makeArgs({ validatorRootClaimableRate: rates }))

    expect(result[0]!.scaledAlphaPrice).toBe(0n)
  })

  it("computes scaledAlphaPrice from dynamicInfo when present", () => {
    const rates = new Map<number, bigint>([[1, 1n << 32n]])
    const dynamicInfoByNetuid = {
      1: { alpha_in: 2000n, tao_in: 1000n },
    }

    const result = calculatePendingRootClaimable(
      makeArgs({ validatorRootClaimableRate: rates, dynamicInfoByNetuid })
    )

    // getScaledAlphaPrice(2000, 1000) = (1000 * 1e9) / 2000 = 500_000_000
    expect(result[0]!.scaledAlphaPrice).toBe(500_000_000n)
  })

  it("computes scaledAlphaPrice = ALPHA_PRICE_SCALE for equal pool values", () => {
    const rates = new Map<number, bigint>([[1, 1n << 32n]])
    const dynamicInfoByNetuid = {
      1: { alpha_in: 1000n, tao_in: 1000n },
    }

    const result = calculatePendingRootClaimable(
      makeArgs({ validatorRootClaimableRate: rates, dynamicInfoByNetuid })
    )

    expect(result[0]!.scaledAlphaPrice).toBe(ALPHA_PRICE_SCALE)
  })

  it("returns objects with correct shape and tokenId fields", () => {
    const netuid = 4
    const rates = new Map<number, bigint>([[netuid, 1n << 32n]])

    const result = calculatePendingRootClaimable(makeArgs({ validatorRootClaimableRate: rates }))

    const balance = result[0]!
    expect(balance).toEqual(
      expect.objectContaining({
        address: ADDRESS,
        tokenId: subDTaoTokenId(NETWORK_ID, netuid, HOTKEY),
        baseTokenId: subDTaoTokenId(NETWORK_ID, netuid),
        hotkey: HOTKEY,
        netuid,
        stake: 0n,
      })
    )
    expect(typeof balance.pendingRootClaim).toBe("bigint")
    expect(typeof balance.scaledAlphaPrice).toBe("bigint")
  })
})
