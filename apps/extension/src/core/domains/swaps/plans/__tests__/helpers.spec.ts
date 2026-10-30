import BigNumber from "bignumber.js"
import type { PublicClient } from "viem"
import { describe, expect, it, vi } from "vitest"

import {
  deriveLegInput,
  planCallToAction,
  planSteps,
  readLegBalance,
  toPersistedLeg,
} from "../helpers"
import type { LegState, SwapPlan } from "../types"
import {
  ALPHA_TOKEN,
  BASE_WTAO,
  EVM_ADDRESS,
  LEG0,
  LEG0_HASH,
  LEG0_OUTPUT,
  LEG1,
  PLAN_ID,
  SUMMARY,
  T0,
} from "./fixtures"

const ED_WEI = 500_000_000_000n

const plan = (landed: bigint): SwapPlan => ({
  id: PLAN_ID,
  phase: "running",
  createdAt: T0,
  updatedAt: T0,
  signUntil: T0 + 1,
  summary: SUMMARY,
  legs: [
    {
      ...LEG0,
      state: {
        at: "landed",
        hash: `0x${"11".repeat(32)}`,
        amount: landed.toString(),
        landedAt: T0,
      },
    },
    { ...LEG1, state: { at: "building", attempt: 1, nextAttemptAt: T0 } },
  ],
})

describe("deriveLegInput", () => {
  it("spends what landed when the signer holds more", () => {
    expect(deriveLegInput(plan(LEG0_OUTPUT - 1n), 1, 5n * 10n ** 18n)).toBe(LEG0_OUTPUT - 1n)
  })

  it("never spends above the quoted input", () => {
    expect(deriveLegInput(plan(LEG0_OUTPUT + 1n), 1, 5n * 10n ** 18n)).toBe(LEG0_OUTPUT)
  })

  it("never spends above what the signer can spend", () => {
    expect(deriveLegInput(plan(LEG0_OUTPUT), 1, LEG0_OUTPUT - ED_WEI)).toBe(LEG0_OUTPUT - ED_WEI)
  })
})

describe("readLegBalance", () => {
  const NATIVE_BALANCE = 5n * 10n ** 18n
  const client = {
    getBalance: vi.fn(async () => NATIVE_BALANCE),
    readContract: vi.fn(async () => 3n),
  } as unknown as PublicClient

  it.each(["964", "945"])(
    "keeps the existential deposit back on Bittensor EVM %s",
    async (networkId) => {
      const leg = { ...LEG1.quote, fromTokenId: `${networkId}:evm-native` }
      expect(await readLegBalance(client, leg)).toBe(NATIVE_BALANCE - ED_WEI)
      expect(client.getBalance).toHaveBeenCalledWith({ address: EVM_ADDRESS })
    }
  )

  it("keeps nothing back on another network", async () => {
    const leg = { ...LEG1.quote, fromTokenId: "8453:evm-native" }
    expect(await readLegBalance(client, leg)).toBe(NATIVE_BALANCE)
  })

  it("reads balanceOf for an ERC20 input and keeps nothing back, the deposit is native", async () => {
    const leg = { ...LEG1.quote, fromTokenId: `964:evm-erc20:${ALPHA_TOKEN.toLowerCase()}` }
    expect(await readLegBalance(client, leg)).toBe(3n)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ALPHA_TOKEN.toLowerCase(),
        functionName: "balanceOf",
        args: [EVM_ADDRESS],
      })
    )
  })
})

describe("toPersistedLeg", () => {
  it("stores amounts as planck strings and fees without exponents", () => {
    expect(
      toPersistedLeg({
        protocol: "forevermoney",
        fromTokenId: "964:evm-native",
        toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
        signer: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
        recipient: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
        inputAmount: 20_000_000_000_000_000n,
        outputAmount: 13_931_778_000_000_000n,
        fees: [
          { name: "Chainlink CCIP Fee", amount: BigNumber("1e-7"), tokenId: "964:evm-native" },
        ],
        timeInSec: 180,
        data: { input: "upTo" },
      })
    ).toEqual({
      protocol: "forevermoney",
      fromTokenId: "964:evm-native",
      toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
      signer: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
      recipient: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      inputAmount: "20000000000000000",
      outputAmount: "13931778000000000",
      fees: [{ name: "Chainlink CCIP Fee", amount: "0.0000001", tokenId: "964:evm-native" }],
      timeInSec: 180,
      data: { input: "upTo" },
    })
  })

  it("refuses a leg without its signer", () => {
    expect(() =>
      toPersistedLeg({ ...LEG1.quote, signer: null, inputAmount: 1n, outputAmount: 1n, fees: [] })
    ).toThrow("A swap plan leg needs a signer and a recipient")
  })
})

describe("planSteps", () => {
  it("follows a landed leg by its transaction, a building one by none", () => {
    expect(planSteps(plan(LEG0_OUTPUT))).toEqual([
      { leg: 0, hash: LEG0_HASH },
      { leg: 1, hash: null },
    ])
  })

  it("follows a failed leg by its transaction, a skipped one by none", () => {
    const stopped: SwapPlan = {
      ...plan(LEG0_OUTPUT),
      phase: "stopped",
      legs: [
        {
          ...LEG0,
          state: { at: "failed", failure: "indeterminate", hash: LEG0_HASH, failedAt: T0 },
        },
        { ...LEG1, state: { at: "skipped" } },
      ],
    }
    expect(planSteps(stopped)).toEqual([
      { leg: 0, hash: LEG0_HASH },
      { leg: 1, hash: null },
    ])
  })

  it("follows the user's latest speed-up of a sent leg", () => {
    const own = `0x${"aa".repeat(32)}` as const
    const speedUp = `0x${"bb".repeat(32)}` as const
    const sped: SwapPlan = {
      ...plan(LEG0_OUTPUT),
      legs: [
        plan(LEG0_OUTPUT).legs[0],
        {
          ...LEG1,
          state: {
            at: "sent",
            hash: own,
            sentAt: T0,
            deadlineAt: T0 + 1,
            evidence: {
              platform: "ethereum",
              raw: "0x02",
              replacements: [{ kind: "speed-up", hash: speedUp, raw: "0x02", sentAt: T0 }],
            },
          },
        },
      ],
    }
    expect(planSteps(sped)[1]).toEqual({ leg: 1, hash: speedUp })
  })
})

describe("planCallToAction", () => {
  const withSecondLeg = (phase: SwapPlan["phase"], state: LegState): SwapPlan => ({
    ...plan(LEG0_OUTPUT),
    phase,
    legs: [plan(LEG0_OUTPUT).legs[0], { ...LEG1, state }],
  })

  it("asks to unlock when the plan waits for the wallet", () => {
    expect(
      planCallToAction(withSecondLeg("paused", { at: "awaiting-user", why: "unlock", since: T0 }))
    ).toEqual({ type: "unlock" })
  })

  it("asks to sign the hardware leg that waits", () => {
    expect(
      planCallToAction(withSecondLeg("paused", { at: "awaiting-user", why: "hardware", since: T0 }))
    ).toEqual({ type: "sign-hardware", leg: 1 })
  })

  it("offers to finish from the intermediate when the stopping leg sent nothing", () => {
    expect(
      planCallToAction(
        withSecondLeg("stopped", { at: "failed", failure: "provider-unavailable", failedAt: T0 })
      )
    ).toEqual({
      type: "finish",
      offer: { fromTokenId: "964:evm-native", toTokenId: BASE_WTAO, fromAddress: EVM_ADDRESS },
    })
  })

  it("sends to the activity when the stopping leg has a transaction", () => {
    expect(
      planCallToAction(
        withSecondLeg("stopped", {
          at: "failed",
          failure: "indeterminate",
          hash: LEG0_HASH,
          failedAt: T0,
        })
      )
    ).toEqual({ type: "check-activity" })
  })

  it("offers to finish from the intermediate when the user's cancel executed", () => {
    expect(
      planCallToAction(
        withSecondLeg("stopped", {
          at: "failed",
          failure: "cancelled",
          hash: `0x${"cc".repeat(32)}`,
          failedAt: T0,
        })
      )
    ).toEqual({
      type: "finish",
      offer: { fromTokenId: "964:evm-native", toTokenId: BASE_WTAO, fromAddress: EVM_ADDRESS },
    })
  })

  it("sends to the activity while the plan runs", () => {
    expect(planCallToAction(plan(LEG0_OUTPUT))).toEqual({ type: "check-activity" })
  })
})
