import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import type { SettledStatus } from "@common/analytics/transactions"
import type { Subscription } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../../db"
import {
  markTransactionDropped,
  type TxStatusFact,
  type TxStatusReason,
  txStatusFacts$,
  updateTransactionStatus,
  updateTransactionsRestart,
} from "../transactions/store.transactions"
import type { TransactionStatus, WalletTransactionEth } from "../transactions/types"
import { settledStatusOf, trackTxSettled } from "./txSettled"

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

  it("caps the time to settle of a transaction older than a week", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "pending", { timestamp: Date.now() - 30 * DAY_MS }))

    await updateTransactionStatus("tx-5", "success")
    await reportFacts()

    expect(trackedCalls()).toEqual([
      ["tx_settled", expect.objectContaining({ status: "success", time_to_settle_ms: 7 * DAY_MS })],
    ])
  })
})
