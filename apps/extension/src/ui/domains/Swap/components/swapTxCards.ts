import {
  getBlockExplorerUrl,
  type Network,
  networkIdFromTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import type { Account } from "@talismn/keyring"
import type { Hex } from "viem"

export type SwapTxStatus =
  | "upcoming"
  | "ready"
  | "signing"
  | "pending"
  | "done"
  | "failed"
  | "skipped"
  /** a delivery Talisman can no longer follow, its outcome is not known */
  | "untracked"

export type SwapTxCardKey = `approval-${number}` | `leg-${number}`

export type SwapTxCardModel = {
  key: SwapTxCardKey
  kind: "approval" | "leg"
  leg: number
  status: SwapTxStatus
  hash?: Hex
  href?: string
  error?: string
}

type TxFacts = Pick<SwapTxCardModel, "hash" | "href" | "error">

export type SwapTxApprovalFacts = TxFacts & { at: "needed" | "sent" | "landed" | "failed" }

export type SwapTxDelivery = "processing" | "success" | "failure" | "untracked"

type SwapTxLegAt =
  | "queued"
  | "awaiting-user"
  | "building"
  | "sent"
  | "landed"
  | "failed"
  | "skipped"

export type SwapTxLegFacts = TxFacts & {
  at: SwapTxLegAt
  /** the last leg only: once its own transaction landed, the swap ends at the funds' delivery */
  delivery?: SwapTxDelivery
  approval?: SwapTxApprovalFacts
}

const LEG_STATUS: Record<SwapTxLegAt, SwapTxStatus> = {
  "queued": "upcoming",
  "awaiting-user": "ready",
  "building": "signing",
  "sent": "pending",
  "landed": "done",
  "failed": "failed",
  "skipped": "skipped",
}

const DELIVERY_STATUS: Record<SwapTxDelivery, SwapTxStatus> = {
  processing: "pending",
  success: "done",
  failure: "failed",
  untracked: "untracked",
}

const ACTIVE_STATUSES: ReadonlySet<SwapTxStatus> = new Set([
  "ready",
  "signing",
  "pending",
  "failed",
])
const MOVED_ON_STATUSES: ReadonlySet<SwapTxStatus> = new Set([
  "signing",
  "pending",
  "done",
  "untracked",
])

const approvalStatus = (at: SwapTxApprovalFacts["at"], leg: SwapTxStatus): SwapTxStatus => {
  if (at === "landed" || MOVED_ON_STATUSES.has(leg)) return "done"
  switch (at) {
    case "sent":
      return "signing"
    case "failed":
      return "failed"
    case "needed":
      return leg === "ready" || leg === "upcoming" ? leg : "skipped"
  }
}

export const swapTxCards = (legs: readonly SwapTxLegFacts[]): SwapTxCardModel[] =>
  legs.flatMap(({ at, delivery, approval, ...tx }, leg): SwapTxCardModel[] => {
    const status = delivery ? DELIVERY_STATUS[delivery] : LEG_STATUS[at]
    const legCard: SwapTxCardModel = { key: `leg-${leg}`, kind: "leg", leg, status, ...tx }
    if (!approval) return [legCard]

    const { at: approvalAt, ...approvalTx } = approval
    const approvalCard: SwapTxCardModel = {
      key: `approval-${leg}`,
      kind: "approval",
      leg,
      status: approvalStatus(approvalAt, status),
      ...approvalTx,
    }
    const waitsOnApproval = status === "ready" && approvalCard.status !== "done"
    return [approvalCard, waitsOnApproval ? { ...legCard, status: "upcoming" } : legCard]
  })

export const activeSwapTxKey = (cards: readonly SwapTxCardModel[]): SwapTxCardKey | null =>
  cards.find((card) => ACTIVE_STATUSES.has(card.status))?.key ?? null

type Translator = (key: string, options?: Record<string, unknown>) => string

export type SwapTxContext = {
  t: Translator
  /** by normalised address */
  accounts: Readonly<Record<string, Pick<Account, "name"> | undefined>>
  networks: Readonly<Record<string, Network | undefined>>
}

const networkOf = ({ networks }: SwapTxContext, tokenId: TokenId) =>
  networks[networkIdFromTokenId(tokenId)]

const txExplorerUrl = (ctx: SwapTxContext, tokenId: TokenId, hash: Hex) =>
  getBlockExplorerUrl(networkOf(ctx, tokenId), { type: "transaction", id: hash }) ?? undefined

export type QuoteApprovalState = {
  isNeeded: boolean
  /** sent, its receipt not in yet */
  isPending: boolean
  hash?: Hex
  failure?: string
}

export type SwapQuoteTxInput = {
  fromTokenId: TokenId
  legCount: number
  approval: QuoteApprovalState
  approvalsNeeded: ReadonlySet<number>
  /** the first leg's swap transaction could not be built or signed */
  failure?: string
}

const quoteApprovalFacts = (
  ctx: SwapTxContext,
  { fromTokenId, approval }: SwapQuoteTxInput
): SwapTxApprovalFacts | undefined => {
  const { isNeeded, isPending, hash, failure } = approval
  const sent = hash ? { hash, href: txExplorerUrl(ctx, fromTokenId, hash) } : {}
  if (failure) return { at: "failed", error: failure, ...sent }
  if (isPending && hash) return { at: "sent", ...sent }
  if (isNeeded) return { at: "needed" }
  return hash ? { at: "landed", ...sent } : undefined
}

/** on the confirm screen the first leg waits on the user and every later leg is queued */
export const swapQuoteTxFacts = (ctx: SwapTxContext, input: SwapQuoteTxInput): SwapTxLegFacts[] =>
  Array.from({ length: input.legCount }, (_, index): SwapTxLegFacts => {
    if (index > 0)
      return {
        at: "queued",
        approval: input.approvalsNeeded.has(index) ? { at: "needed" } : undefined,
      }
    return {
      at: input.failure ? "failed" : "awaiting-user",
      error: input.failure,
      approval: quoteApprovalFacts(ctx, input),
    }
  })

/** an error that keeps the user from going on belongs to the card they are on */
export const withBlockingError = (
  cards: readonly SwapTxCardModel[],
  error: string | null | undefined
): SwapTxCardModel[] => {
  const activeKey = activeSwapTxKey(cards)
  return cards.map((card) =>
    error && card.key === activeKey && !card.error ? { ...card, error } : card
  )
}
