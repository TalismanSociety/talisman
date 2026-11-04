import type { Network } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import {
  activeSwapTxKey,
  type SwapQuoteTxInput,
  type SwapTxContext,
  type SwapTxLegFacts,
  swapQuoteTxFacts,
  swapTxCards,
  withBlockingError,
} from "./swapTxCards"

const t = (key: string, options?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name]))

const network = (fields: Pick<Network, "id" | "name" | "blockExplorerUrls">) => fields as Network

const FROM_TOKEN_ID = "bittensor:substrate-native"
const APPROVAL_HASH = `0x${"33".repeat(32)}` as const

const ctx: SwapTxContext = {
  t,
  accounts: {},
  networks: {
    bittensor: network({
      id: "bittensor",
      name: "Bittensor",
      blockExplorerUrls: ["https://taostats.io/"],
    }),
  },
}

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

  it("keeps a failed approval active, with its error, until it is tried again", () => {
    const cards = swapTxCards(confirming({ at: "failed", error: "Approval reverted" }))

    expect(cards[0]).toMatchObject({ status: "failed", error: "Approval reverted" })
    expect(cards[1].status).toBe("upcoming")
    expect(activeSwapTxKey(cards)).toBe("approval-0")
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

describe("swapQuoteTxFacts", () => {
  const quoteCards = (input: Partial<SwapQuoteTxInput> = {}) =>
    swapTxCards(
      swapQuoteTxFacts(ctx, {
        fromTokenId: FROM_TOKEN_ID,
        legCount: 2,
        approval: { isNeeded: false, isPending: false },
        approvalsNeeded: new Set(),
        ...input,
      })
    )

  it("starts on the first leg and queues the others", () => {
    const cards = quoteCards()

    expect(statuses(cards)).toEqual({ "leg-0": "ready", "leg-1": "upcoming" })
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("starts on the approval the first leg needs", () => {
    const cards = quoteCards({ approval: { isNeeded: true, isPending: false } })

    expect(statuses(cards)).toEqual({
      "approval-0": "ready",
      "leg-0": "upcoming",
      "leg-1": "upcoming",
    })
  })

  it("submits the approval until its receipt is in, with a link to it", () => {
    const cards = quoteCards({
      approval: { isNeeded: true, isPending: true, hash: APPROVAL_HASH },
    })

    expect(cards[0]).toMatchObject({ status: "signing", hash: APPROVAL_HASH })
    expect(cards[0].href).toContain(APPROVAL_HASH)
    expect(activeSwapTxKey(cards)).toBe("approval-0")
  })

  it("completes the approval once it landed and moves on to the leg", () => {
    const cards = quoteCards({
      approval: { isNeeded: false, isPending: false, hash: APPROVAL_HASH },
    })

    expect(statuses(cards)).toMatchObject({ "approval-0": "done", "leg-0": "ready" })
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("asks for the approval again after the revoke it needed first landed", () => {
    const cards = quoteCards({
      approval: { isNeeded: true, isPending: false, hash: APPROVAL_HASH },
    })

    expect(statuses(cards)).toMatchObject({ "approval-0": "ready", "leg-0": "upcoming" })
  })

  it("fails the approval with its error, until it is tried again", () => {
    const cards = quoteCards({
      approval: { isNeeded: true, isPending: false, failure: "Approval failed" },
    })

    expect(cards[0]).toMatchObject({ status: "failed", error: "Approval failed" })
    expect(activeSwapTxKey(cards)).toBe("approval-0")
  })

  it("fails the first leg when its transaction could not be built or signed", () => {
    const cards = quoteCards({ failure: "Rejected" })

    expect(cards[0]).toMatchObject({ key: "leg-0", status: "failed", error: "Rejected" })
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("shows the approval a later leg needs before that leg", () => {
    const cards = quoteCards({ approvalsNeeded: new Set([1]) })

    expect(statuses(cards)).toEqual({
      "leg-0": "ready",
      "approval-1": "upcoming",
      "leg-1": "upcoming",
    })
  })
})

describe("withBlockingError", () => {
  const cards = swapTxCards([{ at: "awaiting-user", approval: { at: "needed" } }])

  it("puts the error on the card the user is on", () => {
    expect(withBlockingError(cards, "Insufficient ETH balance").map(({ error }) => error)).toEqual([
      "Insufficient ETH balance",
      undefined,
    ])
  })

  it("keeps the card's own error", () => {
    const failed = swapTxCards([
      { at: "awaiting-user", approval: { at: "failed", error: "Reverted" } },
    ])

    expect(withBlockingError(failed, "Insufficient ETH balance")[0].error).toBe("Reverted")
  })

  it("leaves the cards alone without an error", () => {
    expect(withBlockingError(cards, null)).toEqual(cards)
  })
})
