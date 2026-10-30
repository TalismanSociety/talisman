import type { SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "../../db"
import {
  dismissTransaction,
  markPlanTransactionDropped,
  markTransactionDropped,
  updateTransactionsRestart,
} from "./store.transactions"

const LIVE_PLAN = "plan-live" as SwapPlanId
const OVER_PLAN = "plan-over" as SwapPlanId
const ACCOUNT = "0x1111111111111111111111111111111111111111" as const
const T0 = 1_700_000_000_000

const plan = (id: SwapPlanId, phase: SwapPlan["phase"]): SwapPlan => ({
  id,
  phase,
  createdAt: T0,
  updatedAt: T0,
  signUntil: null,
  summary: {
    fromTokenId: "bittensor:substrate-native",
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    fromAmount: "1",
    quotedOutput: "1",
    recipient: ACCOUNT,
    protocol: "forevermoney",
    slippage: 0.005,
  },
  legs: [
    {
      quote: {
        protocol: "forevermoney",
        fromTokenId: "964:evm-native",
        toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
        signer: ACCOUNT,
        recipient: ACCOUNT,
        inputAmount: "1",
        outputAmount: "1",
        fees: [],
        timeInSec: 1,
      },
      signerType: "keypair",
      bound: null,
      state: { at: "queued" },
    },
  ],
})

const row = (
  nonce: number,
  { planId, status = "unknown" }: { planId?: SwapPlanId; status?: WalletTransactionEth["status"] }
): WalletTransactionEth => ({
  id: `tx-${nonce}`,
  platform: "ethereum",
  networkId: "964",
  account: ACCOUNT,
  status,
  confirmed: false,
  payload: { from: ACCOUNT, nonce },
  hash: `0x${nonce.toString(16).padStart(64, "0")}`,
  nonce,
  timestamp: T0 + nonce,
  txInfo: planId
    ? {
        type: "swap-forevermoney",
        fromTokenId: "964:evm-native",
        toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
        fromAmount: "1",
        toAmount: "1",
        to: ACCOUNT,
        destinationStartBlock: "1",
        plan: { id: planId, leg: 0 },
      }
    : undefined,
})

describe("rows of a live swap plan", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
    await db.swapPlans.clear()
    await db.swapPlans.bulkPut([plan(LIVE_PLAN, "running"), plan(OVER_PLAN, "stopped")])
  })

  it("survive the restart trim while the plan runs, and go once it is over", async () => {
    await db.transactionsV2.bulkPut([
      row(0, { planId: LIVE_PLAN }),
      row(1, { planId: OVER_PLAN }),
      row(2, {}),
      ...Array.from({ length: 100 }, (_, i) => row(10 + i, {})),
    ])

    await updateTransactionsRestart()

    const kept = (await db.transactionsV2.toArray()).map((tx) => tx.id).sort()
    expect(kept).toContain("tx-0")
    expect(kept).not.toContain("tx-1")
    expect(kept).not.toContain("tx-2")
    expect(kept).toHaveLength(101)
  })

  it("are never marked dropped", async () => {
    await db.transactionsV2.bulkPut([row(0, { planId: LIVE_PLAN }), row(1, { planId: OVER_PLAN })])

    expect(await markTransactionDropped("tx-0")).toBe(false)
    expect(await markTransactionDropped("tx-1")).toBe(true)

    expect((await db.transactionsV2.get("tx-0"))?.status).toBe("unknown")
    expect((await db.transactionsV2.get("tx-1"))?.status).toBe("error")
  })

  it("settle alone when the plan proves its leg dropped: the nonce stays unused", async () => {
    await db.transactionsV2.bulkPut([
      row(4, { status: "pending" }),
      row(5, { planId: LIVE_PLAN, status: "pending" }),
      { ...row(5, { status: "pending" }), id: "tx-5-retry" },
    ])

    await markPlanTransactionDropped("tx-5")

    const statuses = await db.transactionsV2.bulkGet(["tx-4", "tx-5", "tx-5-retry"])
    expect(statuses.map((tx) => tx?.status)).toEqual(["pending", "error", "pending"])
  })

  it("are left to the plan when a restart finds a sibling on their nonce succeeded", async () => {
    await db.transactionsV2.bulkPut([
      row(5, { planId: LIVE_PLAN, status: "success" }),
      { ...row(5, { planId: LIVE_PLAN, status: "pending" }), id: "tx-5-speed-up" },
      { ...row(5, { status: "pending" }), id: "tx-5-other" },
    ])

    await updateTransactionsRestart()

    const statuses = await db.transactionsV2.bulkGet(["tx-5", "tx-5-speed-up", "tx-5-other"])
    expect(statuses.map((tx) => tx?.status)).toEqual(["success", "unknown", "error"])
  })

  it("are never called replaced by a sibling: the plan settles its own row", async () => {
    await db.transactionsV2.bulkPut([
      row(5, { planId: LIVE_PLAN, status: "pending" }),
      { ...row(5, { status: "pending" }), id: "tx-5-other" },
      { ...row(5, { planId: OVER_PLAN, status: "pending" }), id: "tx-5-over" },
    ])

    await markTransactionDropped("tx-5-other")

    const statuses = await db.transactionsV2.bulkGet(["tx-5", "tx-5-other", "tx-5-over"])
    expect(statuses.map((tx) => tx?.status)).toEqual(["pending", "error", "replaced"])
  })

  it("cannot be dismissed", async () => {
    await db.transactionsV2.bulkPut([row(0, { planId: LIVE_PLAN }), row(1, { planId: OVER_PLAN })])

    await dismissTransaction("tx-0")
    await dismissTransaction("tx-1")

    expect((await db.transactionsV2.toArray()).map((tx) => tx.id)).toEqual(["tx-0"])
  })
})
