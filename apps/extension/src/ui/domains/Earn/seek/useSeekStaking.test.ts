import type { Token } from "@talismn/chaindata-provider"
import type { UseQueryResult } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import type { SeekAccountPosition } from "./useSeekStaking"
import {
  calcSeekApr,
  combineSeekPositionQueryResults,
  getSeekPositionValueUsd,
} from "./useSeekStaking"

const seekToken = {
  id: "1:evm-erc20:0x07c3e739c65f81ea79d19a88d27de4c9f15f8df0",
  decimals: 18,
} as Token

const rewardToken = {
  id: "1:evm-erc20:0xreward",
  decimals: 6,
} as Token

describe("calcSeekApr", () => {
  it("calculates APR when stake and reward token match", () => {
    const apr = calcSeekApr({
      rewardRate: 1_000000000000000000n,
      totalStaked: 315_576_000_000000000000000000n,
      stakeToken: seekToken,
      rewardToken: seekToken,
      stakeTokenUsd: 1,
      rewardTokenUsd: 1,
    })

    expect(apr).toBeCloseTo(10, 6)
  })

  it("converts reward value when reward token differs from stake token", () => {
    const apr = calcSeekApr({
      rewardRate: 1_000000n,
      totalStaked: 315_576_000_000000000000000000n,
      stakeToken: seekToken,
      rewardToken,
      stakeTokenUsd: 1,
      rewardTokenUsd: 2,
    })

    expect(apr).toBeCloseTo(20, 6)
  })

  it("returns null when total staked is zero", () => {
    const apr = calcSeekApr({
      rewardRate: 1_000000000000000000n,
      totalStaked: 0n,
      stakeToken: seekToken,
      rewardToken: seekToken,
      stakeTokenUsd: 1,
      rewardTokenUsd: 1,
    })

    expect(apr).toBeNull()
  })

  it("returns null when required rates are missing", () => {
    const apr = calcSeekApr({
      rewardRate: 1_000000000000000000n,
      totalStaked: 315_576_000_000000000000000000n,
      stakeToken: seekToken,
      rewardToken: seekToken,
      stakeTokenUsd: undefined,
      rewardTokenUsd: 1,
    })

    expect(apr).toBeNull()
  })
})

describe("getSeekPositionValueUsd", () => {
  const makePosition = (overrides: Partial<SeekAccountPosition> = {}): SeekAccountPosition => ({
    address: "0xabc",
    staked: 0n,
    earned: 0n,
    pendingWithdrawal: { amount: 0n, unlockTimestamp: 0n },
    ...overrides,
  })

  it("values staked + earned in the stake token when the reward token matches", () => {
    const value = getSeekPositionValueUsd(
      makePosition({ staked: 100_000000000000000000n, earned: 50_000000000000000000n }),
      { stakeToken: seekToken, rewardToken: seekToken, stakeTokenUsd: 2, rewardTokenUsd: 2 }
    )
    // 100 * $2 (stake) + 50 * $2 (reward) = 300
    expect(value).toBeCloseTo(300, 6)
  })

  it("values the reward leg with its own decimals and price", () => {
    const value = getSeekPositionValueUsd(
      // earned is 1.0 of a 6-decimal reward token
      makePosition({ staked: 100_000000000000000000n, earned: 1_000000n }),
      { stakeToken: seekToken, rewardToken, stakeTokenUsd: 2, rewardTokenUsd: 3 }
    )
    // 100 * $2 (stake, 18dp) + 1 * $3 (reward, 6dp) = 203
    expect(value).toBeCloseTo(203, 6)
  })

  it("includes the pending withdrawal amount in the stake leg", () => {
    const value = getSeekPositionValueUsd(
      makePosition({
        staked: 100_000000000000000000n,
        pendingWithdrawal: { amount: 50_000000000000000000n, unlockTimestamp: 0n },
      }),
      { stakeToken: seekToken, rewardToken: seekToken, stakeTokenUsd: 2, rewardTokenUsd: 2 }
    )
    // (100 + 50) * $2 = 300, no rewards
    expect(value).toBeCloseTo(300, 6)
  })

  it("ignores the reward leg when earned is zero", () => {
    const value = getSeekPositionValueUsd(
      makePosition({ staked: 100_000000000000000000n, earned: 0n }),
      { stakeToken: seekToken, rewardToken, stakeTokenUsd: 2, rewardTokenUsd: 3 }
    )
    expect(value).toBeCloseTo(200, 6)
  })

  it("ignores the reward leg when the reward price is unknown", () => {
    const value = getSeekPositionValueUsd(
      makePosition({ staked: 100_000000000000000000n, earned: 50_000000000000000000n }),
      { stakeToken: seekToken, rewardToken, stakeTokenUsd: 2, rewardTokenUsd: undefined }
    )
    expect(value).toBeCloseTo(200, 6)
  })

  it("ignores the stake leg when the stake price is unknown", () => {
    const value = getSeekPositionValueUsd(
      // earned is 10.0 of a 6-decimal reward token
      makePosition({ staked: 100_000000000000000000n, earned: 10_000000n }),
      { stakeToken: seekToken, rewardToken, stakeTokenUsd: undefined, rewardTokenUsd: 3 }
    )
    // stake skipped, 10 * $3 = 30
    expect(value).toBeCloseTo(30, 6)
  })
})

describe("combineSeekPositionQueryResults", () => {
  const activePosition: SeekAccountPosition = {
    address: "0xabc",
    staked: 1n,
    earned: 0n,
    pendingWithdrawal: { amount: 0n, unlockTimestamp: 0n },
  }
  const inactivePosition: SeekAccountPosition = {
    address: "0xdef",
    staked: 0n,
    earned: 0n,
    pendingWithdrawal: { amount: 0n, unlockTimestamp: 0n },
  }

  const queryResult = (overrides: { data?: SeekAccountPosition | null; isLoading?: boolean }) =>
    ({
      data: undefined,
      isLoading: false,
      ...overrides,
    }) as UseQueryResult<SeekAccountPosition | null>

  it("keeps only active positions", () => {
    const { data } = combineSeekPositionQueryResults([
      queryResult({ data: activePosition }),
      queryResult({ data: inactivePosition }),
      queryResult({ data: null }),
    ])
    expect(data).toEqual([activePosition])
  })

  it("is loading while any first fetch has nothing to show yet", () => {
    const { isLoading } = combineSeekPositionQueryResults([
      queryResult({ data: activePosition }),
      queryResult({ data: undefined, isLoading: true }),
    ])
    expect(isLoading).toBe(true)
  })

  it("is not loading during background refetches of settled results", () => {
    // a settled empty result (cached null = known no position) being refetched reports
    // isFetching=true but isLoading=false — the combine must not surface it as loading, or the
    // aggregated positions list would blank to a skeleton on every 30s poll
    const { isLoading } = combineSeekPositionQueryResults([
      queryResult({ data: null, isLoading: false }),
      queryResult({ data: activePosition, isLoading: false }),
    ])
    expect(isLoading).toBe(false)
  })
})
