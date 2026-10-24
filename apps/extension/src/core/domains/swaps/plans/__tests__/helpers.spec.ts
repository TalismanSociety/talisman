import BigNumber from "bignumber.js"
import { describe, expect, it } from "vitest"

import { deriveLegInput, planCallToAction, planSteps, toPersistedLeg } from "../helpers"
import type { LegState, SwapPlan } from "../types"
import {
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
  intermediate: LEG1.quote.signer,
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

  it("keeps the existential deposit on Bittensor EVM", () => {
    expect(deriveLegInput(plan(LEG0_OUTPUT), 1, LEG0_OUTPUT)).toBe(LEG0_OUTPUT - ED_WEI)
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
  it("shows a landed first leg done and the building second leg in progress", () => {
    expect(planSteps(plan(LEG0_OUTPUT))).toEqual([
      { leg: 0, status: "done", hash: LEG0_HASH },
      { leg: 1, status: "in-progress", hash: null },
    ])
  })

  it("shows the stopping leg failed and the legs after it skipped", () => {
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
      { leg: 0, status: "failed", hash: LEG0_HASH },
      { leg: 1, status: "skipped", hash: null },
    ])
  })

  it("asks the user for a leg waiting on them", () => {
    const paused: SwapPlan = {
      ...plan(LEG0_OUTPUT),
      phase: "paused",
      legs: [
        plan(LEG0_OUTPUT).legs[0],
        { ...LEG1, state: { at: "awaiting-user", why: "unlock", since: T0 } },
      ],
    }
    expect(planSteps(paused).map((step) => step.status)).toEqual(["done", "waiting-on-you"])
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

  it("sends to the activity while the plan runs", () => {
    expect(planCallToAction(plan(LEG0_OUTPUT))).toEqual({ type: "check-activity" })
  })
})
