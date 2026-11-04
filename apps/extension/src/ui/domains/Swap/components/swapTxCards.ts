import type { WalletTransaction, WalletTransactionEth } from "@core/domains/transactions/types"
import {
  getBlockExplorerUrl,
  type Network,
  networkIdFromTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"
import { shortenAddress } from "@ui/util/shortenAddress"
import type { Hex } from "viem"

import { getSwapTrackerUrl } from "../getSwapTrackerUrl"
import type { LegStop, QuoteLeg } from "../swap-modules/common.swap-module"
import { type RunLeg, readyLeg, type SwapRun } from "../swap-modules/swap-run"
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

type SwapTxLegAt = "queued" | "awaiting-user" | "sent" | "landed" | "failed" | "skipped"

export type SwapTxLegFacts = TxFacts & {
  at: SwapTxLegAt
  /** the last leg only: once its own transaction landed, the swap ends at the funds' delivery */
  delivery?: SwapTxDelivery
  approval?: SwapTxApprovalFacts
}

const LEG_STATUS: Record<SwapTxLegAt, SwapTxStatus> = {
  "queued": "upcoming",
  "awaiting-user": "ready",
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

export type RunLegSigning = {
  leg: number
  signs?: "leg" | "approval"
  approvalHash?: Hex
  isApprovalPending: boolean
  failure?: string
}

export type SwapRunTxInput = {
  run: SwapRun
  rows: ReadonlyArray<WalletTransaction | null | undefined>
  approvalHashes: Readonly<Partial<Record<number, Hex>>>
  approvalsNeeded: ReadonlySet<number>
  signing: RunLegSigning | null
}

const RUN_LEG_AT: Record<RunLeg["at"], SwapTxLegAt> = {
  queued: "queued",
  ready: "awaiting-user",
  sent: "sent",
  landed: "landed",
  stopped: "failed",
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

const deliveryError = (
  ctx: SwapTxContext,
  leg: QuoteLeg,
  delivery: SwapTxDelivery | undefined,
  row: WalletTransaction | null | undefined
) => {
  if (delivery === "failure") return getSwapProgressDetails(ctx.t, row, true).subtitle
  if (delivery === "untracked")
    return ctx.t("Check your balance on {{network}}", {
      network: networkOf(ctx, leg.toTokenId)?.name ?? "",
    })
  return undefined
}

const FUNDS_ON_SIGNER: ReadonlySet<LegStop> = new Set(["failed", "cancelled"])

const stopError = (ctx: SwapTxContext, leg: QuoteLeg, stop: LegStop) => {
  if (!FUNDS_ON_SIGNER.has(stop) || !leg.signer)
    return ctx.t("Did not complete. Check your activity")
  const account = accountName(ctx, leg.signer)
  return stop === "cancelled"
    ? ctx.t("Cancelled. Your funds wait on {{account}}", { account })
    : ctx.t("Failed. Your funds wait on {{account}}", { account })
}

const runApprovalFacts = (
  ctx: SwapTxContext,
  { run, approvalHashes, approvalsNeeded, signing }: SwapRunTxInput,
  index: number
): SwapTxApprovalFacts | undefined => {
  const tokenId = run.quote.legs[index].fromTokenId
  const sent = (at: "sent" | "landed", hash: Hex): SwapTxApprovalFacts => ({
    at,
    hash,
    href: txExplorerUrl(ctx, tokenId, hash),
  })

  const isNeeded = approvalsNeeded.has(index)
  const sentHash = approvalHashes[index]
  if (signing?.leg !== index) {
    if (sentHash) return sent("landed", sentHash)
    return isNeeded ? { at: "needed" } : undefined
  }

  if (signing.approvalHash && signing.isApprovalPending) return sent("sent", signing.approvalHash)
  if (signing.signs === "approval") return { at: "needed" }
  if (signing.approvalHash) return sent("landed", signing.approvalHash)
  if (signing.signs === "leg") return isNeeded ? { at: "landed" } : undefined
  return isNeeded ? { at: "needed" } : undefined
}

/** a failed sign attempt or build belongs to the transaction the leg asked for next */
const withSigningFailure = (facts: SwapTxLegFacts, signing: RunLegSigning): SwapTxLegFacts => {
  if (!signing.failure) return facts
  if (facts.approval?.at === "needed")
    return { ...facts, approval: { ...facts.approval, at: "failed", error: signing.failure } }
  return { ...facts, at: "failed", error: signing.failure }
}

const isStopped = (run: SwapRun) => run.legs.some((leg) => leg.at === "stopped")

export const swapRunTxFacts = (ctx: SwapTxContext, input: SwapRunTxInput): SwapTxLegFacts[] => {
  const { run, rows, signing } = input
  const lastIndex = run.legs.length - 1
  const stopped = isStopped(run)

  return run.legs.map((leg, index) => {
    const quoteLeg = run.quote.legs[index]
    const hash = "hash" in leg ? leg.hash : undefined
    const delivery =
      index === lastIndex && leg.at === "sent" ? lastLegDelivery(ctx.t, rows[index]) : undefined
    const facts: SwapTxLegFacts = {
      at: leg.at === "queued" && stopped ? "skipped" : RUN_LEG_AT[leg.at],
      hash,
      href: hash ? txExplorerUrl(ctx, quoteLeg.fromTokenId, hash) : undefined,
      error:
        leg.at === "stopped"
          ? stopError(ctx, quoteLeg, leg.stop)
          : deliveryError(ctx, quoteLeg, delivery, rows[index]),
      delivery,
      approval: runApprovalFacts(ctx, input, index),
    }
    return signing?.leg === index ? withSigningFailure(facts, signing) : facts
  })
}

export type RecoveryOffer = { fromTokenId: TokenId; toTokenId: TokenId; fromAddress: string }

export type SwapRunFooter =
  | { type: "processing" }
  | { type: "sign"; offer: RecoveryOffer | null }
  | { type: "close" }
  | { type: "finish"; offer: RecoveryOffer }
  | { type: "check-activity" }

const offerFrom = ({ quote }: SwapRun, index: number): RecoveryOffer | null => {
  const { fromTokenId, signer } = quote.legs[index] ?? {}
  if (!fromTokenId || !signer) return null
  return {
    fromTokenId,
    toTokenId: quote.legs[quote.legs.length - 1].toTokenId,
    fromAddress: signer,
  }
}

const recoveryOffer = (run: SwapRun): RecoveryOffer | null => {
  const index = run.legs.findIndex((leg) => leg.at === "stopped")
  const stopped = run.legs[index]
  return stopped?.at === "stopped" && FUNDS_ON_SIGNER.has(stopped.stop)
    ? offerFrom(run, index)
    : null
}

export const swapRunFooter = (
  { run, signing }: Pick<SwapRunTxInput, "run" | "signing">,
  cards: readonly SwapTxCardModel[]
): SwapRunFooter => {
  const ready = readyLeg(run)
  if (ready !== null)
    return { type: "sign", offer: signing?.failure ? offerFrom(run, ready) : null }
  if (isStopped(run)) {
    const offer = recoveryOffer(run)
    return offer ? { type: "finish", offer } : { type: "check-activity" }
  }
  switch (cards.at(-1)?.status) {
    case "done":
      return { type: "close" }
    case "failed":
    case "untracked":
      return { type: "check-activity" }
    default:
      return { type: "processing" }
  }
}

/** the user can speed up or cancel a sent EVM leg until it is mined, through its latest replacement */
export const pendingEvmLegRow = (
  { run, rows }: Pick<SwapRunTxInput, "run" | "rows">,
  index: number
): WalletTransactionEth | undefined => {
  const row = rows[index]
  const isUnsettled = row?.status === "pending" || row?.status === "unknown"
  return run.legs[index].at === "sent" && row?.platform === "ethereum" && isUnsettled
    ? { ...row, status: "pending" }
    : undefined
}

export const legTrackerUrl = ({ rows }: Pick<SwapRunTxInput, "rows">, index: number) => {
  const row = rows[index]
  return (row && getSwapTrackerUrl(row.txInfo, row.id)) ?? undefined
}
