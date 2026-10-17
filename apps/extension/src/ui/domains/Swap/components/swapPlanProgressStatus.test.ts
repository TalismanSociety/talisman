import type { PlanLeg, SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { describe, expect, it } from "vitest"

import { getSwapPlanProgressDetails } from "./swapPlanProgressStatus"

const t = (key: string, options?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name]))

const HASH = `0x${"22".repeat(32)}` as const

const leg = (state: PlanLeg["state"]): PlanLeg => ({
  quote: {
    protocol: "forevermoney",
    fromTokenId: "964:evm-native",
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    signer: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
    recipient: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
    inputAmount: "1",
    outputAmount: "1",
    fees: [],
    timeInSec: 1,
  },
  signerType: "keypair",
  bound: null,
  state,
})

const LANDED = leg({ at: "landed", hash: HASH, amount: "1", landedAt: 1 })

const plan = (phase: SwapPlan["phase"], second: PlanLeg): SwapPlan => ({
  id: "plan" as SwapPlanId,
  phase,
  createdAt: 1,
  updatedAt: 1,
  signUntil: 2,
  summary: {
    fromTokenId: "bittensor:substrate-native",
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    fromAmount: "1",
    quotedOutput: "1",
    recipient: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
    protocol: "forevermoney",
    slippage: 0.005,
  },
  intermediate: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
  legs: [LANDED, second],
})

const deliveredRow = {
  id: HASH,
  hash: HASH,
  platform: "ethereum",
  networkId: "964",
  account: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
  status: "success",
  confirmed: true,
  payload: {},
  nonce: 1,
  timestamp: 1,
  swapStatus: "finished",
} satisfies WalletTransactionEth

describe("getSwapPlanProgressDetails", () => {
  it("counts the step in progress", () => {
    expect(
      getSwapPlanProgressDetails(
        t,
        plan("running", leg({ at: "building", attempt: 1, nextAttemptAt: 1 })),
        null
      )
    ).toEqual({
      title: "Swap in progress",
      subtitle: "This may take a few minutes. You can close this window.",
      animStatus: "processing",
      pillLabel: "Step 2 of 2",
    })
  })

  it("follows the last leg's delivery once the plan completed", () => {
    expect(getSwapPlanProgressDetails(t, plan("completed", LANDED), deliveredRow)).toEqual({
      title: "Swap complete",
      subtitle: "Your swap was successful!",
      animStatus: "success",
    })
  })

  it("asks for the unlock a paused plan waits on", () => {
    const details = getSwapPlanProgressDetails(
      t,
      plan("paused", leg({ at: "awaiting-user", why: "unlock", since: 1 })),
      null
    )
    expect(details.title).toBe("Unlock Talisman to continue")
  })

  it("asks for the Ledger a hardware leg waits on", () => {
    const details = getSwapPlanProgressDetails(
      t,
      plan("paused", leg({ at: "awaiting-user", why: "hardware", since: 1 })),
      null
    )
    expect(details.title).toBe("Sign step 2 on your Ledger")
  })

  it("says where the funds wait when the stopping leg sent nothing", () => {
    expect(
      getSwapPlanProgressDetails(
        t,
        plan("stopped", leg({ at: "failed", failure: "provider-unavailable", failedAt: 1 })),
        null
      )
    ).toEqual({
      title: "Swap stopped after step 1",
      subtitle: "Your funds wait on your account at the end of step 1.",
      animStatus: "failure",
    })
  })

  it("points to the activity when the stopping leg sent a transaction", () => {
    const details = getSwapPlanProgressDetails(
      t,
      plan("stopped", leg({ at: "failed", failure: "indeterminate", hash: HASH, failedAt: 1 })),
      null
    )
    expect(details.subtitle).toBe("Step 2 did not complete. Check your activity for its status.")
  })
})
