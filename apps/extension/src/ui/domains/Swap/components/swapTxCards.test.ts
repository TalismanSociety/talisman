import {
  EVM_ADDRESS,
  LEG0,
  LEG0_HASH,
  LEG1,
  PLAN_ID,
  SUB_ADDRESS,
  SUMMARY,
  T0,
} from "@core/domains/swaps/plans/__tests__/fixtures"
import type { LegState, SwapPlan } from "@core/domains/swaps/plans/types"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import type { Network } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { describe, expect, it } from "vitest"

import {
  activeSwapTxKey,
  legTrackerUrl,
  type PlanLegSigning,
  pendingEvmLegRow,
  type SwapPlanTxInput,
  type SwapTxContext,
  type SwapTxLegFacts,
  swapPlanFooter,
  swapPlanTxFacts,
  swapTxCards,
} from "./swapTxCards"

const t = (key: string, options?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name]))

const network = (fields: Pick<Network, "id" | "name" | "blockExplorerUrls">) => fields as Network

const LEG1_HASH = `0x${"22".repeat(32)}` as const
const APPROVAL_HASH = `0x${"33".repeat(32)}` as const

const ctx: SwapTxContext = {
  t,
  accounts: {
    [normalizeAddress(SUB_ADDRESS)]: { name: "Main" },
    [normalizeAddress(EVM_ADDRESS)]: { name: "Bridge account" },
  },
  networks: {
    "bittensor": network({
      id: "bittensor",
      name: "Bittensor",
      blockExplorerUrls: ["https://taostats.io/"],
    }),
    "964": network({
      id: "964",
      name: "Bittensor EVM",
      blockExplorerUrls: ["https://evm.taostats.io/"],
    }),
    "8453": network({ id: "8453", name: "Base", blockExplorerUrls: ["https://basescan.org/"] }),
  },
}

const LANDED_0: LegState = { at: "landed", hash: LEG0_HASH, amount: "1", landedAt: T0 }
const LANDED_1: LegState = { at: "landed", hash: LEG1_HASH, amount: "1", landedAt: T0 }
const SENT_1: LegState = {
  at: "sent",
  hash: LEG1_HASH,
  sentAt: T0,
  deadlineAt: T0 + 1,
  evidence: { platform: "ethereum" },
}
const AWAITING_HARDWARE: LegState = { at: "awaiting-user", why: "hardware", since: T0 }

const plan = (phase: SwapPlan["phase"], first: LegState, second: LegState): SwapPlan => ({
  id: PLAN_ID,
  phase,
  createdAt: T0,
  updatedAt: T0,
  signUntil: T0 + 1,
  summary: SUMMARY,
  intermediate: EVM_ADDRESS,
  legs: [
    { ...LEG0, state: first },
    { ...LEG1, state: second },
  ],
})

const ethRow = (
  hash: `0x${string}`,
  fields: Partial<WalletTransactionEth> = {}
): WalletTransactionEth => ({
  id: hash,
  hash,
  platform: "ethereum",
  networkId: "964",
  account: EVM_ADDRESS,
  status: "success",
  confirmed: true,
  payload: {},
  nonce: 1,
  timestamp: T0,
  ...fields,
})

const forevermoneyRow = (swapStatus: WalletTransactionEth["swapStatus"]) =>
  ethRow(LEG1_HASH, {
    blockNumber: "200",
    swapStatus,
    txInfo: {
      type: "swap-forevermoney",
      fromTokenId: LEG1.quote.fromTokenId,
      toTokenId: LEG1.quote.toTokenId,
      fromAmount: "1",
      toAmount: "1",
      to: EVM_ADDRESS,
      destinationStartBlock: "1",
    },
  })

const rows = (...list: WalletTransactionEth[]) => new Map(list.map((row) => [row.id, row]))

const planCards = (value: SwapPlan, input: Partial<Omit<SwapPlanTxInput, "plan">> = {}) =>
  swapTxCards(
    swapPlanTxFacts(ctx, {
      plan: value,
      rows: new Map(),
      approvalsNeeded: new Set(),
      signing: null,
      ...input,
    })
  )

const statuses = (cards: ReturnType<typeof swapTxCards>) =>
  Object.fromEntries(cards.map((card) => [card.key, card.status]))

describe("swapTxCards", () => {
  const confirming = (approval?: SwapTxLegFacts["approval"]): SwapTxLegFacts[] => [
    { at: "awaiting-user", approval },
    { at: "queued" },
  ]

  it("gives each leg a card and puts an approval card before the leg that needs it", () => {
    const cards = swapTxCards(confirming({ at: "needed" }))

    expect(cards.map(({ key, kind, leg }) => ({ key, kind, leg }))).toEqual([
      { key: "approval-0", kind: "approval", leg: 0 },
      { key: "leg-0", kind: "leg", leg: 0 },
      { key: "leg-1", kind: "leg", leg: 1 },
    ])
    expect(statuses(cards)).toEqual({
      "approval-0": "ready",
      "leg-0": "upcoming",
      "leg-1": "upcoming",
    })
    expect(activeSwapTxKey(cards)).toBe("approval-0")
  })

  it("gives a swap without an approval one card per leg, the first one active", () => {
    const cards = swapTxCards(confirming())

    expect(statuses(cards)).toEqual({ "leg-0": "ready", "leg-1": "upcoming" })
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("keeps the approval active while it is submitted", () => {
    const cards = swapTxCards(confirming({ at: "sent", hash: APPROVAL_HASH }))

    expect(statuses(cards)).toMatchObject({ "approval-0": "signing", "leg-0": "upcoming" })
    expect(activeSwapTxKey(cards)).toBe("approval-0")
  })

  it("keeps a failed approval active, with its error, until it is tried again", () => {
    const cards = swapTxCards(confirming({ at: "failed", error: "Approval reverted" }))

    expect(cards[0]).toMatchObject({ status: "failed", error: "Approval reverted" })
    expect(cards[1].status).toBe("upcoming")
    expect(activeSwapTxKey(cards)).toBe("approval-0")
  })

  it("moves on to the leg once its approval landed", () => {
    const cards = swapTxCards(confirming({ at: "landed", hash: APPROVAL_HASH, href: "explorer" }))

    expect(cards[0]).toMatchObject({ status: "done", hash: APPROVAL_HASH, href: "explorer" })
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("shows a blocking error on the leg it holds back without failing it", () => {
    const cards = swapTxCards([{ at: "awaiting-user", error: "Insufficient ETH balance" }])

    expect(cards[0]).toMatchObject({ status: "ready", error: "Insufficient ETH balance" })
  })

  it("has no active card once every transaction is done", () => {
    const cards = swapTxCards([{ at: "landed" }, { at: "landed", delivery: "success" }])
    expect(activeSwapTxKey(cards)).toBeNull()
  })
})

describe("swapPlanTxFacts", () => {
  it("follows the first leg while it is sent and the next one waits", () => {
    const cards = planCards(
      plan(
        "running",
        {
          at: "sent",
          hash: LEG0_HASH,
          sentAt: T0,
          deadlineAt: T0 + 1,
          evidence: { platform: "ethereum" },
        },
        { at: "queued" }
      )
    )

    expect(statuses(cards)).toEqual({ "leg-0": "pending", "leg-1": "upcoming" })
    expect(cards[0].href).toContain(LEG0_HASH)
    expect(cards[1].href).toBeUndefined()
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("makes the second leg active once the first one landed", () => {
    const cards = planCards(plan("running", LANDED_0, SENT_1))

    expect(statuses(cards)).toEqual({ "leg-0": "done", "leg-1": "pending" })
    expect(activeSwapTxKey(cards)).toBe("leg-1")
  })

  it("shows a leg the background builds and signs as submitting", () => {
    const cards = planCards(
      plan("running", LANDED_0, { at: "building", attempt: 1, nextAttemptAt: 0 })
    )
    expect(cards[1].status).toBe("signing")
  })

  it("keeps the last leg pending until its funds arrive", () => {
    const cards = planCards(plan("completed", LANDED_0, LANDED_1), {
      rows: rows(forevermoneyRow("sending")),
    })
    expect(cards[1].status).toBe("pending")
    expect(activeSwapTxKey(cards)).toBe("leg-1")
  })

  it("keeps the last leg pending while its transaction loads", () => {
    expect(planCards(plan("completed", LANDED_0, LANDED_1))[1].status).toBe("pending")
  })

  it("completes the last leg once its funds arrived", () => {
    const cards = planCards(plan("completed", LANDED_0, LANDED_1), {
      rows: rows(forevermoneyRow("finished")),
    })
    expect(statuses(cards)).toEqual({ "leg-0": "done", "leg-1": "done" })
    expect(activeSwapTxKey(cards)).toBeNull()
  })

  it("fails the last leg when its delivery failed", () => {
    const cards = planCards(plan("completed", LANDED_0, LANDED_1), {
      rows: rows(forevermoneyRow("failed")),
    })
    expect(cards[1]).toMatchObject({
      status: "failed",
      error: "Did not complete. Check your activity",
    })
  })

  it("does not call a delivery the tracker lost a failure", () => {
    const cards = planCards(plan("completed", LANDED_0, LANDED_1), {
      rows: rows(forevermoneyRow("unknown")),
    })
    expect(cards[1]).toMatchObject({ status: "untracked", error: "Check your balance on Base" })
  })

  it("does not follow a last leg whose transaction the wallet no longer holds", () => {
    const cards = planCards(plan("completed", LANDED_0, LANDED_1), {
      rows: new Map([[LEG1_HASH, null]]),
    })
    expect(cards[1].status).toBe("untracked")
  })

  it("makes the leg a paused plan waits on active", () => {
    const cards = planCards(
      plan("paused", LANDED_0, { at: "awaiting-user", why: "unlock", since: T0 })
    )
    expect(activeSwapTxKey(cards)).toBe("leg-1")
  })

  it("says where the funds wait when the stopping leg sent nothing", () => {
    const cards = planCards(
      plan("stopped", LANDED_0, { at: "failed", failure: "provider-unavailable", failedAt: T0 })
    )
    expect(cards[1]).toMatchObject({
      status: "failed",
      error: "Not sent. Your funds wait on Bridge account",
    })
  })

  it("says where the funds wait once the user cancelled a sent leg", () => {
    const cards = planCards(
      plan("stopped", LANDED_0, {
        at: "failed",
        failure: "cancelled",
        hash: LEG1_HASH,
        failedAt: T0,
      })
    )
    expect(cards[1].error).toBe("Cancelled. Your funds wait on Bridge account")
  })

  it("points to the activity when the stopping leg sent a transaction", () => {
    const cards = planCards(
      plan("stopped", LANDED_0, {
        at: "failed",
        failure: "indeterminate",
        hash: LEG1_HASH,
        failedAt: T0,
      })
    )
    expect(cards[1].error).toBe("Did not complete. Check your activity")
  })

  it("skips the second leg when the first one did not go through", () => {
    const cards = planCards(
      plan("aborted", { at: "failed", failure: "expired", failedAt: T0 }, { at: "skipped" })
    )
    expect(statuses(cards)).toEqual({ "leg-0": "failed", "leg-1": "skipped" })
    expect(cards[0].error).toBe("Not sent. Your funds wait on Main")
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("shows the first leg's approval completed when the screen that sent it knows it", () => {
    const cards = planCards(plan("running", LANDED_0, SENT_1), { leg0ApprovalHash: APPROVAL_HASH })

    expect(cards[0]).toMatchObject({ key: "approval-0", status: "done", hash: APPROVAL_HASH })
    expect(cards[0].href).toContain(APPROVAL_HASH)
  })

  describe("a later leg's approval", () => {
    const waiting = plan("paused", LANDED_0, AWAITING_HARDWARE)
    const signing = (fields: Partial<PlanLegSigning> = {}): PlanLegSigning => ({
      leg: 1,
      isApprovalPending: false,
      ...fields,
    })

    it("waits for its leg while an earlier leg runs", () => {
      const cards = planCards(plan("running", SENT_1, { at: "queued" }), {
        approvalsNeeded: new Set([1]),
      })
      expect(statuses(cards)).toMatchObject({ "approval-1": "upcoming", "leg-1": "upcoming" })
    })

    it("becomes active once its leg asks for the approval", () => {
      const cards = planCards(waiting, {
        approvalsNeeded: new Set([1]),
        signing: signing({ signs: "approval" }),
      })
      expect(statuses(cards)).toMatchObject({ "approval-1": "ready", "leg-1": "upcoming" })
      expect(activeSwapTxKey(cards)).toBe("approval-1")
    })

    it("shows up when the leg asks for an approval nobody predicted", () => {
      const cards = planCards(waiting, { signing: signing({ signs: "approval" }) })
      expect(cards.map((card) => card.key)).toContain("approval-1")
    })

    it("is submitting while its transaction mines", () => {
      const cards = planCards(waiting, {
        approvalsNeeded: new Set([1]),
        signing: signing({
          signs: "approval",
          approvalHash: APPROVAL_HASH,
          isApprovalPending: true,
        }),
      })
      expect(cards[1]).toMatchObject({ status: "signing", hash: APPROVAL_HASH })
    })

    it("is done once the allowance covers the leg", () => {
      const cards = planCards(waiting, {
        approvalsNeeded: new Set([1]),
        signing: signing({ signs: "leg", approvalHash: APPROVAL_HASH }),
      })
      expect(statuses(cards)).toMatchObject({ "approval-1": "done", "leg-1": "ready" })
      expect(activeSwapTxKey(cards)).toBe("leg-1")
    })

    it("is done once its leg moved on", () => {
      const cards = planCards(plan("running", LANDED_0, SENT_1), {
        approvalsNeeded: new Set([1]),
      })
      expect(cards[1].status).toBe("done")
    })

    it("carries the failure of a leg that could not be prepared while the approval is due", () => {
      const cards = planCards(waiting, {
        approvalsNeeded: new Set([1]),
        signing: signing({ failure: "This swap provider is unavailable" }),
      })
      expect(cards[1]).toMatchObject({
        key: "approval-1",
        status: "failed",
        error: "This swap provider is unavailable",
      })
      expect(activeSwapTxKey(cards)).toBe("approval-1")
    })
  })

  it("fails the leg whose signature the user rejected", () => {
    const cards = planCards(plan("paused", LANDED_0, AWAITING_HARDWARE), {
      signing: { leg: 1, signs: "leg", isApprovalPending: false, failure: "Rejected" },
    })
    expect(cards[1]).toMatchObject({ status: "failed", error: "Rejected" })
  })
})

describe("swapPlanFooter", () => {
  const footer = (value: SwapPlan, rowList: WalletTransactionEth[] = []) =>
    swapPlanFooter(value, planCards(value, { rows: rows(...rowList) }))

  it("asks nothing of the user while the plan runs", () => {
    expect(footer(plan("running", LANDED_0, SENT_1))).toEqual({ type: "processing" })
  })

  it("asks nothing of the user while the last leg's funds travel", () => {
    expect(footer(plan("completed", LANDED_0, LANDED_1), [forevermoneyRow("sending")])).toEqual({
      type: "processing",
    })
  })

  it("closes once the funds arrived", () => {
    expect(footer(plan("completed", LANDED_0, LANDED_1), [forevermoneyRow("finished")])).toEqual({
      type: "close",
    })
  })

  it("points to the activity once the delivery failed", () => {
    expect(footer(plan("completed", LANDED_0, LANDED_1), [forevermoneyRow("failed")])).toEqual({
      type: "check-activity",
    })
  })

  it("asks to unlock a plan paused on the unlock", () => {
    expect(
      footer(plan("paused", LANDED_0, { at: "awaiting-user", why: "unlock", since: T0 }))
    ).toEqual({ type: "unlock" })
  })

  it("asks to sign a leg the user signs on screen", () => {
    expect(footer(plan("paused", LANDED_0, AWAITING_HARDWARE))).toEqual({
      type: "sign-hardware",
      leg: 1,
    })
  })
})

describe("pendingEvmLegRow", () => {
  it("offers to speed up or cancel the leg whose EVM transaction is pending", () => {
    const pending = ethRow(LEG1_HASH, { status: "pending" })
    expect(
      pendingEvmLegRow({ plan: plan("running", LANDED_0, SENT_1), rows: rows(pending) }, 1)
    ).toEqual(pending)
  })

  it("offers to speed up or cancel the user's latest replacement of a pending leg", () => {
    const SPEED_UP_HASH = `0x${"44".repeat(32)}` as const
    const speedUp = ethRow(SPEED_UP_HASH, { status: "pending", isReplacement: true })
    const replaced = plan("running", LANDED_0, {
      ...SENT_1,
      evidence: {
        platform: "ethereum",
        raw: "0x01",
        replacements: [{ kind: "speed-up", hash: SPEED_UP_HASH, raw: "0x02", sentAt: T0 }],
      },
    })
    expect(
      pendingEvmLegRow(
        { plan: replaced, rows: rows(ethRow(LEG1_HASH, { status: "pending" }), speedUp) },
        1
      )
    ).toEqual(speedUp)
  })

  it("keeps offering to speed up or cancel a sent leg whose row a restart left unknown", () => {
    const unknown = ethRow(LEG1_HASH, { status: "unknown" })
    expect(
      pendingEvmLegRow({ plan: plan("running", LANDED_0, SENT_1), rows: rows(unknown) }, 1)
    ).toEqual({ ...unknown, status: "pending" })
  })

  it("stops offering to speed up or cancel once the leg's transaction is mined", () => {
    expect(
      pendingEvmLegRow(
        { plan: plan("running", LANDED_0, SENT_1), rows: rows(ethRow(LEG1_HASH)) },
        1
      )
    ).toBeUndefined()
  })
})

describe("legTrackerUrl", () => {
  it("tracks a leg whose provider follows the delivery", () => {
    expect(
      legTrackerUrl(
        { plan: plan("completed", LANDED_0, LANDED_1), rows: rows(forevermoneyRow("sending")) },
        1
      )
    ).toContain(LEG1_HASH)
  })

  it("has nothing to track before the leg is sent", () => {
    expect(
      legTrackerUrl({ plan: plan("running", LANDED_0, { at: "queued" }), rows: new Map() }, 1)
    ).toBeUndefined()
  })
})
