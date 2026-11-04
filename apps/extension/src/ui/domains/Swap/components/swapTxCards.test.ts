import type { WalletTransactionEth } from "@core/domains/transactions/types"
import type { Network } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { describe, expect, it } from "vitest"

import { quoteFromLegs } from "../swap-modules/helpers"
import type { RunLeg, SwapRun } from "../swap-modules/swap-run"
import {
  activeSwapTxKey,
  legTrackerUrl,
  pendingEvmLegRow,
  type RunLegSigning,
  type SwapQuoteTxInput,
  type SwapRunTxInput,
  type SwapTxContext,
  type SwapTxLegFacts,
  swapQuoteTxFacts,
  swapRunFooter,
  swapRunTxFacts,
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

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const HUB_TAO = "964:evm-native"
const BASE_WTAO = "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"
const LEG0_HASH = `0x${"11".repeat(32)}` as const
const LEG1_HASH = `0x${"22".repeat(32)}` as const
const T0 = 1_700_000_000_000

const runCtx: SwapTxContext = {
  t,
  accounts: {
    [normalizeAddress(SUB_ADDRESS)]: { name: "Main" },
    [normalizeAddress(EVM_ADDRESS)]: { name: "Bridge account" },
  },
  networks: {
    ...ctx.networks,
    "964": network({
      id: "964",
      name: "Bittensor EVM",
      blockExplorerUrls: ["https://evm.taostats.io/"],
    }),
    "8453": network({ id: "8453", name: "Base", blockExplorerUrls: ["https://basescan.org/"] }),
  },
}

const QUOTE = quoteFromLegs(
  [
    {
      protocol: "bittensor-evm",
      fromTokenId: FROM_TOKEN_ID,
      toTokenId: HUB_TAO,
      signer: SUB_ADDRESS,
      recipient: EVM_ADDRESS,
      inputAmount: 1_000_000_000n,
      outputAmount: 999_999_500_000_000_000n,
      fees: [],
      timeInSec: 12,
    },
    {
      protocol: "forevermoney",
      fromTokenId: HUB_TAO,
      toTokenId: BASE_WTAO,
      signer: EVM_ADDRESS,
      recipient: RECIPIENT,
      inputAmount: 999_999_500_000_000_000n,
      outputAmount: 990_000_000_000_000_000n,
      fees: [],
      timeInSec: 180,
    },
  ],
  {
    protocol: "forevermoney",
    decentralisationScore: 2,
    providerLogo: "forevermoney.svg",
    providerName: "ForeverMoney",
  }
)

const SENT_0: RunLeg = { at: "sent", hash: LEG0_HASH, input: 1_000_000_000n }
const LANDED_0: RunLeg = { at: "landed", hash: LEG0_HASH, amount: 999_999_500_000_000_000n }
const READY: RunLeg = { at: "ready" }
const SENT_1: RunLeg = { at: "sent", hash: LEG1_HASH, input: 999_999_500_000_000_000n }
const stopped = (hash: `0x${string}`, stop: "failed" | "cancelled" | "untracked"): RunLeg => ({
  at: "stopped",
  hash,
  stop,
})

const run = (first: RunLeg, second: RunLeg): SwapRun => ({
  id: "run-1",
  quote: QUOTE,
  slippage: 0.005,
  legs: [first, second],
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
      fromTokenId: HUB_TAO,
      toTokenId: BASE_WTAO,
      fromAmount: "1",
      toAmount: "1",
      to: EVM_ADDRESS,
      destinationStartBlock: "1",
    },
  })

const runCards = (value: SwapRun, input: Partial<Omit<SwapRunTxInput, "run">> = {}) =>
  swapTxCards(
    swapRunTxFacts(runCtx, {
      run: value,
      rows: [],
      approvalsNeeded: new Set(),
      approvalHashes: {},
      signing: null,
      ...input,
    })
  )

describe("swapRunTxFacts", () => {
  it("follows the first leg while it is sent and the next one waits", () => {
    const cards = runCards(run(SENT_0, { at: "queued" }))

    expect(statuses(cards)).toEqual({ "leg-0": "pending", "leg-1": "upcoming" })
    expect(cards[0].href).toContain(LEG0_HASH)
    expect(cards[1].href).toBeUndefined()
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("asks the user to sign the second leg once the first one landed", () => {
    const cards = runCards(run(LANDED_0, READY))

    expect(statuses(cards)).toEqual({ "leg-0": "done", "leg-1": "ready" })
    expect(activeSwapTxKey(cards)).toBe("leg-1")
  })

  it("keeps the last leg pending until its funds arrive", () => {
    const cards = runCards(run(LANDED_0, SENT_1), {
      rows: [undefined, forevermoneyRow("sending")],
    })
    expect(cards[1].status).toBe("pending")
    expect(activeSwapTxKey(cards)).toBe("leg-1")
  })

  it("keeps the last leg pending while its transaction loads", () => {
    expect(runCards(run(LANDED_0, SENT_1))[1].status).toBe("pending")
  })

  it("completes the last leg once its funds arrived", () => {
    const cards = runCards(run(LANDED_0, SENT_1), {
      rows: [undefined, forevermoneyRow("finished")],
    })
    expect(statuses(cards)).toEqual({ "leg-0": "done", "leg-1": "done" })
    expect(activeSwapTxKey(cards)).toBeNull()
  })

  it("fails the last leg when its delivery failed", () => {
    const cards = runCards(run(LANDED_0, SENT_1), {
      rows: [undefined, forevermoneyRow("failed")],
    })
    expect(cards[1]).toMatchObject({
      status: "failed",
      error: "CCIP could not execute the delivery. Open the CCIP explorer to retry it manually.",
    })
  })

  it("tells where to claim a refunded delivery", () => {
    const cards = runCards(run(LANDED_0, SENT_1), {
      rows: [undefined, forevermoneyRow("refunded")],
    })
    expect(cards[1].error).toBe(
      "Delivery failed and your TAO is claimable by your EVM address on Bittensor EVM. Claim it on the ForeverMoney app."
    )
  })

  it("does not call a delivery the tracker lost a failure", () => {
    const cards = runCards(run(LANDED_0, SENT_1), {
      rows: [undefined, forevermoneyRow("unknown")],
    })
    expect(cards[1]).toMatchObject({ status: "untracked", error: "Check your balance on Base" })
  })

  it("does not follow a last leg whose transaction the wallet no longer holds", () => {
    const cards = runCards(run(LANDED_0, SENT_1), { rows: [undefined, null] })
    expect(cards[1].status).toBe("untracked")
  })

  it("says where the funds wait when the stopping leg failed", () => {
    const cards = runCards(run(LANDED_0, stopped(LEG1_HASH, "failed")))
    expect(cards[1]).toMatchObject({
      status: "failed",
      error: "Failed. Your funds wait on Bridge account",
    })
  })

  it("says where the funds wait once the user cancelled a sent leg", () => {
    const cards = runCards(run(LANDED_0, stopped(LEG1_HASH, "cancelled")))
    expect(cards[1].error).toBe("Cancelled. Your funds wait on Bridge account")
  })

  it("points to the activity when the wallet could not tell where the funds went", () => {
    const cards = runCards(run(LANDED_0, stopped(LEG1_HASH, "untracked")))
    expect(cards[1].error).toBe("Did not complete. Check your activity")
  })

  it("skips the second leg when the first one did not go through", () => {
    const cards = runCards(run(stopped(LEG0_HASH, "failed"), { at: "queued" }))
    expect(statuses(cards)).toEqual({ "leg-0": "failed", "leg-1": "skipped" })
    expect(cards[0].error).toBe("Failed. Your funds wait on Main")
    expect(activeSwapTxKey(cards)).toBe("leg-0")
  })

  it("shows the first leg's approval completed when the screen that sent it knows it", () => {
    const cards = runCards(run(LANDED_0, SENT_1), { approvalHashes: { 0: APPROVAL_HASH } })

    expect(cards[0]).toMatchObject({ key: "approval-0", status: "done", hash: APPROVAL_HASH })
    expect(cards[0].href).toContain(APPROVAL_HASH)
  })

  describe("a later leg's approval", () => {
    const waiting = run(LANDED_0, READY)
    const signing = (fields: Partial<RunLegSigning> = {}): RunLegSigning => ({
      leg: 1,
      isApprovalPending: false,
      ...fields,
    })

    it("waits for its leg while an earlier leg runs", () => {
      const cards = runCards(run(SENT_0, { at: "queued" }), { approvalsNeeded: new Set([1]) })
      expect(statuses(cards)).toMatchObject({ "approval-1": "upcoming", "leg-1": "upcoming" })
    })

    it("becomes active once its leg asks for the approval", () => {
      const cards = runCards(waiting, {
        approvalsNeeded: new Set([1]),
        signing: signing({ signs: "approval" }),
      })
      expect(statuses(cards)).toMatchObject({ "approval-1": "ready", "leg-1": "upcoming" })
      expect(activeSwapTxKey(cards)).toBe("approval-1")
    })

    it("keeps its link once its leg moved on", () => {
      const cards = runCards(run(LANDED_0, SENT_1), {
        approvalsNeeded: new Set([1]),
        approvalHashes: { 1: APPROVAL_HASH },
      })
      expect(cards.find((card) => card.key === "approval-1")).toMatchObject({
        status: "done",
        hash: APPROVAL_HASH,
      })
    })

    it("shows up when the leg asks for an approval nobody predicted", () => {
      const cards = runCards(waiting, { signing: signing({ signs: "approval" }) })
      expect(cards.map((card) => card.key)).toContain("approval-1")
    })

    it("is submitting while its transaction mines", () => {
      const cards = runCards(waiting, {
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
      const cards = runCards(waiting, {
        approvalsNeeded: new Set([1]),
        signing: signing({ signs: "leg", approvalHash: APPROVAL_HASH }),
      })
      expect(statuses(cards)).toMatchObject({ "approval-1": "done", "leg-1": "ready" })
      expect(activeSwapTxKey(cards)).toBe("leg-1")
    })

    it("is done once its leg moved on", () => {
      const cards = runCards(run(LANDED_0, SENT_1), { approvalsNeeded: new Set([1]) })
      expect(cards[1].status).toBe("done")
    })

    it("carries the failure of a leg that could not be prepared while the approval is due", () => {
      const cards = runCards(waiting, {
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
    const cards = runCards(run(LANDED_0, READY), {
      signing: { leg: 1, signs: "leg", isApprovalPending: false, failure: "Rejected" },
    })
    expect(cards[1]).toMatchObject({ status: "failed", error: "Rejected" })
  })
})

describe("swapRunFooter", () => {
  const footer = (
    value: SwapRun,
    rows: SwapRunTxInput["rows"] = [],
    signing: SwapRunTxInput["signing"] = null
  ) => swapRunFooter({ run: value, signing }, runCards(value, { rows, signing }))

  it("asks nothing of the user while a leg runs", () => {
    expect(footer(run(SENT_0, { at: "queued" }))).toEqual({ type: "processing" })
  })

  it("asks nothing of the user while the last leg's funds travel", () => {
    expect(footer(run(LANDED_0, SENT_1), [undefined, forevermoneyRow("sending")])).toEqual({
      type: "processing",
    })
  })

  it("closes once the funds arrived", () => {
    expect(footer(run(LANDED_0, SENT_1), [undefined, forevermoneyRow("finished")])).toEqual({
      type: "close",
    })
  })

  it("points to the activity once the delivery failed", () => {
    expect(footer(run(LANDED_0, SENT_1), [undefined, forevermoneyRow("failed")])).toEqual({
      type: "check-activity",
    })
  })

  it("asks to sign the leg whose previous one landed", () => {
    expect(footer(run(LANDED_0, READY))).toEqual({ type: "sign", offer: null })
  })

  it("also offers to swap the landed funds onward once the leg after them failed", () => {
    const failed = {
      leg: 1,
      isApprovalPending: false,
      failure: "This swap provider is unavailable",
    }
    expect(footer(run(LANDED_0, READY), [], failed)).toEqual({
      type: "sign",
      offer: { fromTokenId: HUB_TAO, toTokenId: BASE_WTAO, fromAddress: EVM_ADDRESS },
    })
  })

  it("offers to swap the funds a stopped leg left on its signer to the route's destination", () => {
    expect(footer(run(LANDED_0, stopped(LEG1_HASH, "cancelled")))).toEqual({
      type: "finish",
      offer: { fromTokenId: HUB_TAO, toTokenId: BASE_WTAO, fromAddress: EVM_ADDRESS },
    })
  })

  it("points to the activity when the wallet could not tell where the funds went", () => {
    expect(footer(run(stopped(LEG0_HASH, "untracked"), { at: "queued" }))).toEqual({
      type: "check-activity",
    })
  })
})

describe("pendingEvmLegRow", () => {
  it("offers to speed up or cancel the leg whose EVM transaction is pending", () => {
    const pending = ethRow(LEG1_HASH, { status: "pending" })
    expect(pendingEvmLegRow({ run: run(LANDED_0, SENT_1), rows: [undefined, pending] }, 1)).toEqual(
      pending
    )
  })

  it("keeps offering to speed up or cancel a sent leg whose row a restart left unknown", () => {
    const unknown = ethRow(LEG1_HASH, { status: "unknown" })
    expect(pendingEvmLegRow({ run: run(LANDED_0, SENT_1), rows: [undefined, unknown] }, 1)).toEqual(
      { ...unknown, status: "pending" }
    )
  })

  it("stops offering to speed up or cancel once the leg's transaction is mined", () => {
    expect(
      pendingEvmLegRow({ run: run(LANDED_0, SENT_1), rows: [undefined, ethRow(LEG1_HASH)] }, 1)
    ).toBeUndefined()
  })
})

describe("legTrackerUrl", () => {
  it("tracks a leg whose provider follows the delivery", () => {
    expect(legTrackerUrl({ rows: [undefined, forevermoneyRow("sending")] }, 1)).toContain(LEG1_HASH)
  })

  it("has nothing to track before the leg is sent", () => {
    expect(legTrackerUrl({ rows: [] }, 1)).toBeUndefined()
  })
})
