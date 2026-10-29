import {
  type PlanCallToAction,
  planCallToAction,
  planSteps,
} from "@core/domains/swaps/plans/helpers"
import type { LegState, PlanLeg, SwapPlan } from "@core/domains/swaps/plans/types"
import type { WalletTransaction, WalletTransactionEth } from "@core/domains/transactions/types"
import {
  getBlockExplorerUrl,
  type Network,
  networkIdFromTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"
import { getSwapTrackerUrl } from "@ui/domains/Swap/getSwapTrackerUrl"
import { shortenAddress } from "@ui/util/shortenAddress"
import type { Hex } from "viem"

import { getSwapProgressDetails } from "./swapProgressStatus"

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

/** one transaction of a swap: a leg, or the token approval a leg needs first */
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

/** a leg as the plan knows it, or as the confirm screen stands in for it before the plan exists */
export type SwapTxLegFacts = TxFacts & {
  at: LegState["at"]
  /** the last leg only: once its own transaction landed, the swap ends at the funds' delivery */
  delivery?: SwapTxDelivery
  approval?: SwapTxApprovalFacts
}

const LEG_STATUS: Record<LegState["at"], SwapTxStatus> = {
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

const accountName = ({ accounts }: SwapTxContext, address: string) =>
  accounts[normalizeAddress(address)]?.name ?? shortenAddress(address)

const networkOf = ({ networks }: SwapTxContext, tokenId: TokenId) =>
  networks[networkIdFromTokenId(tokenId)]

export const txExplorerUrl = (ctx: SwapTxContext, tokenId: TokenId, hash: Hex) =>
  getBlockExplorerUrl(networkOf(ctx, tokenId), { type: "transaction", id: hash }) ?? undefined

/** the first leg's token approval as the confirm screen runs it */
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
  /** the later legs whose spender allowance was short when read */
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

/** before the plan exists the first leg waits on the user and every later leg is queued */
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

/** the leg the user signs on screen, while they sign it: what it asks for, and what went wrong */
export type PlanLegSigning = {
  leg: number
  signs?: "leg" | "approval"
  approvalHash?: Hex
  isApprovalPending: boolean
  failure?: string
}

export type SwapPlanTxInput = {
  plan: SwapPlan
  /** the transaction rows of the legs that have a hash, by hash: null once the wallet no longer holds the row */
  rows: ReadonlyMap<string, WalletTransaction | null>
  /** only the screen that sent leg 0's approval knows it */
  leg0ApprovalHash?: Hex
  /** the later legs whose spender allowance was short when read */
  approvalsNeeded: ReadonlySet<number>
  signing: PlanLegSigning | null
}

const UNTRACKED_SWAP_STATUSES: ReadonlySet<WalletTransaction["swapStatus"]> = new Set([
  "invalid",
  "unknown",
])

const lastLegDelivery = (
  t: Translator,
  row: WalletTransaction | null | undefined
): SwapTxDelivery => {
  if (row === null || row?.status === "unknown" || UNTRACKED_SWAP_STATUSES.has(row?.swapStatus))
    return "untracked"
  return getSwapProgressDetails(t, row, true).animStatus
}

const legRow = ({ plan, rows }: Pick<SwapPlanTxInput, "plan" | "rows">, index: number) => {
  const hash = planSteps(plan)[index]?.hash
  return hash ? rows.get(hash) : undefined
}

const legError = (ctx: SwapTxContext, leg: PlanLeg, delivery: SwapTxDelivery | undefined) => {
  const { t } = ctx
  if (delivery === "failure") return t("Did not complete. Check your activity")
  if (delivery === "untracked")
    return t("Check your balance on {{network}}", {
      network: networkOf(ctx, leg.quote.toTokenId)?.name ?? "",
    })
  if (leg.state.at !== "failed") return undefined

  const account = accountName(ctx, leg.quote.signer)
  if (leg.state.failure === "cancelled")
    return t("Cancelled. Your funds wait on {{account}}", { account })
  return leg.state.hash
    ? t("Did not complete. Check your activity")
    : t("Not sent. Your funds wait on {{account}}", { account })
}

const approvalFacts = (
  ctx: SwapTxContext,
  input: SwapPlanTxInput,
  index: number
): SwapTxApprovalFacts | undefined => {
  const { plan, leg0ApprovalHash, approvalsNeeded, signing } = input
  const tokenId = plan.legs[index].quote.fromTokenId
  const sent = (at: "sent" | "landed", hash: Hex): SwapTxApprovalFacts => ({
    at,
    hash,
    href: txExplorerUrl(ctx, tokenId, hash),
  })

  if (index === 0) return leg0ApprovalHash ? sent("landed", leg0ApprovalHash) : undefined
  const isNeeded = approvalsNeeded.has(index)
  if (signing?.leg !== index) return isNeeded ? { at: "needed" } : undefined

  if (signing.approvalHash && signing.isApprovalPending) return sent("sent", signing.approvalHash)
  if (signing.signs === "approval") return { at: "needed" }
  if (signing.approvalHash) return sent("landed", signing.approvalHash)
  if (signing.signs === "leg") return isNeeded ? { at: "landed" } : undefined
  return isNeeded ? { at: "needed" } : undefined
}

/** a failed sign attempt or build belongs to the transaction the leg asked for next */
const withSigningFailure = (facts: SwapTxLegFacts, signing: PlanLegSigning): SwapTxLegFacts => {
  if (!signing.failure) return facts
  if (facts.approval?.at === "needed")
    return { ...facts, approval: { ...facts.approval, at: "failed", error: signing.failure } }
  return { ...facts, at: "failed", error: signing.failure }
}

export const swapPlanTxFacts = (ctx: SwapTxContext, input: SwapPlanTxInput): SwapTxLegFacts[] => {
  const { plan, signing } = input
  const lastIndex = plan.legs.length - 1

  return planSteps(plan).map(({ leg: index, hash }) => {
    const leg = plan.legs[index]
    const delivery =
      index === lastIndex && leg.state.at === "landed"
        ? lastLegDelivery(ctx.t, legRow(input, index))
        : undefined
    const facts: SwapTxLegFacts = {
      at: leg.state.at,
      hash: hash ?? undefined,
      href: hash ? txExplorerUrl(ctx, leg.quote.fromTokenId, hash) : undefined,
      error: legError(ctx, leg, delivery),
      delivery,
      approval: approvalFacts(ctx, input, index),
    }
    return signing?.leg === index ? withSigningFailure(facts, signing) : facts
  })
}

export type SwapPlanFooter = { type: "processing" } | { type: "close" } | PlanCallToAction

/** while the swap moves nothing is asked of the user; once it waits or ends, the footer offers the way forward */
export const swapPlanFooter = (
  plan: SwapPlan,
  cards: readonly SwapTxCardModel[]
): SwapPlanFooter => {
  switch (plan.phase) {
    case "proposed":
    case "running":
      return { type: "processing" }
    case "completed":
      switch (cards.at(-1)?.status) {
        case "pending":
          return { type: "processing" }
        case "done":
          return { type: "close" }
        default:
          return { type: "check-activity" }
      }
    case "paused":
    case "stopped":
    case "aborted":
      return planCallToAction(plan)
  }
}

/** the user can speed up or cancel a sent EVM leg until it is mined, through its latest replacement */
export const pendingEvmLegRow = (
  input: Pick<SwapPlanTxInput, "plan" | "rows">,
  index: number
): WalletTransactionEth | undefined => {
  const row = legRow(input, index)
  const isUnsettled = row?.status === "pending" || row?.status === "unknown"
  return input.plan.legs[index].state.at === "sent" && row?.platform === "ethereum" && isUnsettled
    ? { ...row, status: "pending" }
    : undefined
}

export const legTrackerUrl = (input: Pick<SwapPlanTxInput, "plan" | "rows">, index: number) => {
  const row = legRow(input, index)
  return (row && getSwapTrackerUrl(row.txInfo, row.id)) ?? undefined
}
