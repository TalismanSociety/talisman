import type { EthNetworkId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"
import {
  deserializeSeekStakingMetadata,
  deserializeSeekStakingPositions,
  getSeekStakingPositionCacheKey,
  getSeekStakingPositionsCacheKey,
  removeSeekStakingPositionCache,
  serializeSeekStakingMetadata,
  serializeSeekStakingPositions,
} from "./seekStakingCache"
import type { SeekAccountPosition, SeekStakingRawMetadata } from "./useSeekStaking"

vi.mock("@ui/api/api", () => ({
  api: {
    queryCacheGet: vi.fn(),
    queryCacheSet: vi.fn(),
    queryCacheRemove: vi.fn(),
  },
}))

const { api } = await import("@ui/api/api")
const mockedApi = vi.mocked(api)

const networkId = "1" as EthNetworkId
const stakingContractAddress = "0x52b8969F9C1d1EFFd4f0ABeA2104dF02B65c165C"

describe("SEEK staking cache keys", () => {
  it("normalizes single-position keys", () => {
    expect(getSeekStakingPositionCacheKey(networkId, stakingContractAddress, "0xABCDEF")).toBe(
      "earn:seek:position:1:0x52b8969f9c1d1effd4f0abea2104df02b65c165c:0xabcdef"
    )
  })

  it("uses order-independent selected account scopes", () => {
    const first = getSeekStakingPositionsCacheKey(networkId, stakingContractAddress, [
      "0xBBBB",
      "0xAAAA",
    ])
    const second = getSeekStakingPositionsCacheKey(networkId, stakingContractAddress, [
      "0xaaaa",
      "0xbbbb",
    ])

    expect(first).toBe(second)
    expect(first).toBe(
      "earn:seek:positions:1:0x52b8969f9c1d1effd4f0abea2104df02b65c165c:0xaaaa%2C0xbbbb"
    )
  })
})

describe("SEEK staking cache DTOs", () => {
  it("round-trips metadata bigint fields through JSON-safe DTOs", () => {
    const metadata: SeekStakingRawMetadata = {
      stakeTokenAddress: "0x07C3E739C65f81Ea79d19A88d27de4C9f15f8Df0",
      rewardTokenAddress: "0x07C3E739C65f81Ea79d19A88d27de4C9f15f8Df0",
      rewardRate: 123n,
      totalStaked: 456n,
      minStakeAmount: 789n,
      withdrawDelay: 10n,
    }

    const dto = serializeSeekStakingMetadata(metadata)

    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto)
    expect(deserializeSeekStakingMetadata(dto)).toEqual(metadata)
  })

  it("round-trips position bigint fields through JSON-safe DTOs", () => {
    const positions: SeekAccountPosition[] = [
      {
        address: "0xABCDEF",
        staked: 123n,
        earned: 456n,
        pendingWithdrawal: {
          amount: 789n,
          unlockTimestamp: 10n,
        },
      },
    ]

    const dto = serializeSeekStakingPositions(positions)

    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto)
    expect(deserializeSeekStakingPositions(dto)).toEqual(positions)
  })
})

describe("removeSeekStakingPositionCache", () => {
  it("removes both single-account and selected-account position entries", async () => {
    mockedApi.queryCacheRemove.mockResolvedValue(true)

    await removeSeekStakingPositionCache({
      networkId,
      stakingContractAddress,
      address: "0xBBBB",
      accountAddresses: ["0xBBBB", "0xAAAA"],
    })

    expect(mockedApi.queryCacheRemove).toHaveBeenCalledWith(
      "earn:seek:position:1:0x52b8969f9c1d1effd4f0abea2104df02b65c165c:0xbbbb"
    )
    expect(mockedApi.queryCacheRemove).toHaveBeenCalledWith(
      "earn:seek:positions:1:0x52b8969f9c1d1effd4f0abea2104df02b65c165c:0xaaaa%2C0xbbbb"
    )
  })
})
