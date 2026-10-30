import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import type { SettledStatus } from "@common/analytics/transactions"
import type { Subscription } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../../db"
import { LEG0, LEG0_HASH, LEG1, PLAN_ID, SUMMARY } from "../swaps/plans/__tests__/fixtures"
import type { SwapPlan } from "../swaps/plans/types"
import {
  markTransactionDropped,
  type TxStatusFact,
  type TxStatusReason,
  txStatusFacts$,
  updateTransactionStatus,
  updateTransactionsRestart,
} from "../transactions/store.transactions"
import type { TransactionStatus, WalletTransactionEth } from "../transactions/types"
import {
  settledStatusOf,
  trackSwapOutcome,
  trackSwapPlanSettled,
  trackTxSettled,
} from "./txSettled"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => {
  const calls: TrackedCall[] = []
  return { calls }
})

vi.mock("./track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const settled = vi.hoisted(() => vi.fn(async () => {}))
vi.mock("./flowTracker", () => ({ flowTracker: { settled } }))

vi.mock("./txContext", () => ({
  analyticsNetworkId: vi.fn(async () => "ethereum"),
  signerOfAddress: vi.fn(async () => "local"),
}))

const ACCOUNT = "0x1111111111111111111111111111111111111111"
const DAY_MS = 24 * 60 * 60_000

const makeEvmTx = (
  nonce: number,
  status: TransactionStatus = "pending",
  { suffix = "", timestamp = Date.now() }: { suffix?: string; timestamp?: number } = {}
): WalletTransactionEth => ({
  id: `tx-${nonce}${suffix}`,
  platform: "ethereum",
  networkId: "1",
  account: ACCOUNT,
  status,
  confirmed: false,
  payload: { from: ACCOUNT, nonce },
  hash: `0x${nonce.toString(16).padStart(64, "0")}`,
  nonce,
  timestamp,
})

const trackedCalls = () => tracked.calls

const expectTrackedPropsToParse = () => {
  for (const [event, props] of trackedCalls()) catalogue[event].schema.parse(props ?? {})
}

describe("settledStatusOf", () => {
  const table: [TransactionStatus, TransactionStatus, TxStatusReason, SettledStatus | null][] = [
    ["success", "error", "watch", null],
    ["error", "success", "watch", null],
    ["success", "success", "watch", null],
    ["pending", "pending", "watch", null],
    ["pending", "unknown", "sibling", null],
    ["pending", "error", "dropped", "dropped"],
    ["pending", "error", "restart", "replaced"],
    ["unknown", "error", "restart", "replaced"],
    ["pending", "success", "watch", "success"],
    ["pending", "error", "watch", "error"],
    ["pending", "replaced", "sibling", "replaced"],
    ["unknown", "success", "watch", "success"],
  ]

  it.each(table)("%s to %s by %s settles as %s", (from, to, reason, settled) => {
    expect(settledStatusOf(from, to, reason)).toBe(settled)
  })
})

describe("tx_settled from the transaction store", () => {
  let facts: TxStatusFact[]
  let subscription: Subscription

  const reportFacts = async () => {
    for (const fact of facts) await trackTxSettled(fact)
  }

  const settledStatuses = () =>
    trackedCalls()
      .filter(([event]) => event === "tx_settled")
      .map(([, props]) => props?.status)

  beforeEach(async () => {
    await db.transactionsV2.clear()
    tracked.calls.length = 0
    settled.mockClear()
    facts = []
    subscription = txStatusFacts$.subscribe((fact) => facts.push(fact))
  })

  afterEach(() => {
    expectTrackedPropsToParse()
    subscription.unsubscribe()
    vi.restoreAllMocks()
  })

  it("reports the first final status once, and not its confirmed rewrite", async () => {
    await db.transactionsV2.put(makeEvmTx(5))

    await updateTransactionStatus("tx-5", "success")
    await updateTransactionStatus("tx-5", "error", 42n, true)
    await reportFacts()

    expect(facts).toHaveLength(2)
    expect(settledStatuses()).toEqual(["success"])
    expect(settled).toHaveBeenCalledOnce()
    expect(settled).toHaveBeenCalledWith(
      "tx-5",
      { status: "success", timeToSettleMs: expect.any(Number) },
      expect.any(Number)
    )
  })

  it("reports same-nonce siblings as replaced, and not a lower nonce left unknown", async () => {
    await db.transactionsV2.bulkPut([
      makeEvmTx(5),
      makeEvmTx(5, "pending", { suffix: "-speed-up" }),
      makeEvmTx(5, "unknown", { suffix: "-cancel" }),
      makeEvmTx(4),
    ])

    await updateTransactionStatus("tx-5", "success")
    await reportFacts()

    expect((await db.transactionsV2.get("tx-4"))?.status).toBe("unknown")
    expect(settledStatuses().sort()).toEqual(["replaced", "replaced", "success"])
  })

  it("reports a dropped transaction as dropped while storing it as an error", async () => {
    await db.transactionsV2.put(makeEvmTx(5))

    await markTransactionDropped("tx-5")
    await reportFacts()

    expect((await db.transactionsV2.get("tx-5"))?.status).toBe("error")
    expect(settledStatuses()).toEqual(["dropped"])
  })

  it("reports the losers of a nonce found on restart as replaced", async () => {
    await db.transactionsV2.bulkPut([
      makeEvmTx(5, "success"),
      makeEvmTx(5, "pending", { suffix: "-speed-up" }),
      makeEvmTx(5, "unknown", { suffix: "-cancel" }),
    ])

    await updateTransactionsRestart()
    await reportFacts()

    expect(settledStatuses()).toEqual(["replaced", "replaced"])
  })

  it("publishes nothing for a write that did not commit", async () => {
    await db.transactionsV2.put(makeEvmTx(5))
    vi.spyOn(db.transactionsV2, "filter").mockImplementationOnce(() => {
      throw new Error("storage failed")
    })

    expect(await updateTransactionStatus("tx-5", "success")).toBe(false)
    expect(await updateTransactionStatus("missing", "success")).toBe(false)

    expect((await db.transactionsV2.get("tx-5"))?.status).toBe("pending")
    expect(facts).toEqual([])
  })

  const makeSwapTx = (nonce: number): WalletTransactionEth => ({
    ...makeEvmTx(nonce),
    txInfo: {
      type: "swap-lifi",
      protocolName: "stargate",
      fromTokenId: "1:evm-native",
      toTokenId: "42161:evm-native",
      fromAmount: "1",
      toAmount: "1",
      to: ACCOUNT,
    },
  })

  it("leaves a successful swap to its exchange, and settles a failed one with the swap", async () => {
    await db.transactionsV2.bulkPut([makeSwapTx(5), makeSwapTx(6)])

    await updateTransactionStatus("tx-5", "success")
    await updateTransactionStatus("tx-6", "error")
    await reportFacts()

    expect(settledStatuses().sort()).toEqual(["error", "success"])
    expect(settled).toHaveBeenCalledOnce()
    expect(settled).toHaveBeenCalledWith(
      "tx-6",
      {
        status: "error",
        timeToSettleMs: expect.any(Number),
        properties: { protocol: "lifi", cross_chain: true },
      },
      expect.any(Number)
    )
  })

  it("ends a swap when its exchange reaches a final status, timed from the stored transaction", async () => {
    const row = { ...makeSwapTx(5), timestamp: 1_000 }

    await trackSwapOutcome({ row, status: "exchanging", at: 5_000 })
    await trackSwapOutcome({ row: makeEvmTx(6), status: "finished", at: 5_000 })
    expect(settled).not.toHaveBeenCalled()

    await trackSwapOutcome({ row, status: "refunded", at: 5_000 })
    expect(settled).toHaveBeenCalledWith(
      "tx-5",
      {
        status: "success",
        timeToSettleMs: 4_000,
        properties: { protocol: "lifi", cross_chain: true, swap_status: "refunded" },
      },
      expect.any(Number)
    )
  })

  it("caps the time to settle of a transaction older than a week", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "pending", { timestamp: Date.now() - 30 * DAY_MS }))

    await updateTransactionStatus("tx-5", "success")
    await reportFacts()

    expect(trackedCalls()).toEqual([
      ["tx_settled", expect.objectContaining({ status: "success", time_to_settle_ms: 7 * DAY_MS })],
    ])
  })
})

describe("a swap plan settles its flow once, on the plan", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
    tracked.calls.length = 0
    settled.mockClear()
  })

  const LANDED_LEG0 = {
    ...LEG0,
    state: { at: "landed", hash: LEG0_HASH, amount: "1", landedAt: 2_000 },
  } as const

  const plan = (phase: SwapPlan["phase"], second: SwapPlan["legs"][1]): SwapPlan => ({
    id: PLAN_ID,
    phase,
    createdAt: 1_000,
    updatedAt: 1_000,
    signUntil: 10_000,
    summary: SUMMARY,
    legs: [LANDED_LEG0, second],
  })

  it("skips the rows of its legs", async () => {
    const row = {
      ...makeEvmTx(5),
      txInfo: {
        type: "swap-forevermoney",
        fromTokenId: "964:evm-native",
        toTokenId: LEG1.quote.toTokenId,
        fromAmount: "1",
        toAmount: "1",
        to: ACCOUNT,
        destinationStartBlock: "1",
        plan: { id: PLAN_ID, leg: 1 },
      },
    } satisfies WalletTransactionEth

    await trackTxSettled({ row, from: "pending", to: "error", reason: "watch", at: 5_000 })
    await trackSwapOutcome({ row, status: "finished", at: 5_000 })

    expect(trackedCalls()).toEqual([])
    expect(settled).not.toHaveBeenCalled()
  })

  it("completes the flow linked to the first leg, timed from its row", async () => {
    await db.transactionsV2.put({ ...makeEvmTx(5), id: LEG0_HASH, timestamp: 1_500 })

    await trackSwapPlanSettled({
      plan: {
        ...plan("completed", {
          ...LEG1,
          state: { at: "landed", hash: `0x${"22".repeat(32)}`, amount: "1", landedAt: 3_000 },
        }),
        pausedFor: "unlock",
      },
      at: 61_500,
    })

    expect(settled).toHaveBeenCalledWith(
      LEG0_HASH,
      {
        status: "success",
        timeToSettleMs: 60_000,
        properties: {
          protocol: "forevermoney",
          cross_chain: true,
          plan_outcome: "completed",
          paused_for: "unlock",
        },
      },
      expect.any(Number)
    )
  })

  it("completes the flow linked to the first leg's own transaction when a speed-up of it executed", async () => {
    const landedLeg1 = {
      ...LEG1,
      state: { at: "landed", hash: `0x${"22".repeat(32)}`, amount: "1", landedAt: 3_000 },
    } as const
    const spedUpLeg0 = {
      ...LEG0,
      state: {
        at: "landed",
        hash: `0x${"33".repeat(32)}`,
        sentHash: LEG0_HASH,
        amount: "1",
        landedAt: 2_000,
      },
    } as const

    await trackSwapPlanSettled({
      plan: { ...plan("completed", landedLeg1), legs: [spedUpLeg0, landedLeg1] },
      at: 3_000,
    })

    expect(settled).toHaveBeenCalledWith(
      LEG0_HASH,
      expect.objectContaining({ status: "success" }),
      expect.any(Number)
    )
  })

  it("names the leg and the reason a plan stopped at", async () => {
    await trackSwapPlanSettled({
      plan: plan("stopped", {
        ...LEG1,
        state: { at: "failed", failure: "provider-unavailable", failedAt: 3_000 },
      }),
      at: 3_000,
    })

    expect(settled).toHaveBeenCalledWith(
      LEG0_HASH,
      {
        status: "error",
        timeToSettleMs: 2_000,
        properties: {
          protocol: "forevermoney",
          cross_chain: true,
          plan_outcome: "stopped",
          stopped_at_leg: 2,
          stop_reason: "provider_unavailable",
        },
      },
      expect.any(Number)
    )
  })

  it("settles nothing for a plan whose first leg was never signed", async () => {
    await trackSwapPlanSettled({
      plan: {
        ...plan("aborted", { ...LEG1, state: { at: "skipped" } }),
        legs: [
          { ...LEG0, state: { at: "failed", failure: "expired", failedAt: 3_000 } },
          { ...LEG1, state: { at: "skipped" } },
        ],
      },
      at: 3_000,
    })

    expect(settled).not.toHaveBeenCalled()
  })
})
