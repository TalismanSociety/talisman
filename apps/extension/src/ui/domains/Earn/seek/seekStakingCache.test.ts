import type { EthNetworkId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import {
  deserializeSeekStakingMetadata,
  deserializeSeekStakingPosition,
  getSeekStakingPositionCacheKey,
  isSeekAccountPositionActive,
  removeSeekStakingPositionCache,
  serializeSeekStakingMetadata,
  serializeSeekStakingPosition,
} from "./seekStakingCache"
import type { SeekAccountPosition, SeekStakingRawMetadata } from "./useSeekStaking"

vi.mock("@ui/api/api", () => ({
  api: {
    queryCacheRemove: vi.fn(),
  },
}))

const { api } = await import("@ui/api/api")
const mockedApi = vi.mocked(api)

const networkId = "1" as EthNetworkId
const stakingContractAddress = "0x52b8969F9C1d1EFFd4f0ABeA2104dF02B65c165C"
const address = "0xAbCd"
const positionCacheKey = "earn:seek:position:1:0x52b8969f9c1d1effd4f0abea2104df02b65c165c:0xabcd"

describe("SEEK staking cache keys", () => {
  it("uses a per-address position key, lowercased", () => {
    expect(getSeekStakingPositionCacheKey(networkId, stakingContractAddress, address)).toBe(
      positionCacheKey
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
    const position: SeekAccountPosition = {
      address: "0xABCDEF",
      staked: 123n,
      earned: 456n,
      pendingWithdrawal: {
        amount: 789n,
        unlockTimestamp: 10n,
      },
    }

    const dto = serializeSeekStakingPosition(position)

    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto)
    expect(deserializeSeekStakingPosition(dto)).toEqual(position)
  })

  it("serializes null positions to null", () => {
    expect(serializeSeekStakingPosition(null)).toBeNull()
    expect(deserializeSeekStakingPosition(null)).toBeNull()
  })
})

describe("isSeekAccountPositionActive", () => {
  const base: SeekAccountPosition = {
    address: "0xABCDEF",
    staked: 0n,
    earned: 0n,
    pendingWithdrawal: { amount: 0n, unlockTimestamp: 0n },
  }

  it("is inactive when staked, earned and pending are all zero", () => {
    expect(isSeekAccountPositionActive(base)).toBe(false)
  })

  it("is active when any of staked, earned or pending is non-zero", () => {
    expect(isSeekAccountPositionActive({ ...base, staked: 1n })).toBe(true)
    expect(isSeekAccountPositionActive({ ...base, earned: 1n })).toBe(true)
    expect(
      isSeekAccountPositionActive({
        ...base,
        pendingWithdrawal: { amount: 1n, unlockTimestamp: 0n },
      })
    ).toBe(true)
  })
})

describe("removeSeekStakingPositionCache", () => {
  it("removes the per-address position entry", async () => {
    mockedApi.queryCacheRemove.mockResolvedValue(true)

    await removeSeekStakingPositionCache({ networkId, stakingContractAddress, address })

    expect(mockedApi.queryCacheRemove).toHaveBeenCalledWith(positionCacheKey)
  })
})
