import type { Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { calcSeekApr, getSeekErc20TokenId } from "./useSeekStaking"

const seekToken = {
  id: "1:evm-erc20:0x07c3e739c65f81ea79d19a88d27de4c9f15f8df0",
  decimals: 18,
} as Token

const rewardToken = {
  id: "1:evm-erc20:0xreward",
  decimals: 6,
} as Token

describe("getSeekErc20TokenId", () => {
  it("normalizes EVM ERC20 token ids", () => {
    expect(getSeekErc20TokenId("1", "0x07C3E739C65f81Ea79d19A88d27de4C9f15f8Df0")).toBe(
      "1:evm-erc20:0x07c3e739c65f81ea79d19a88d27de4c9f15f8df0"
    )
  })
})

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
