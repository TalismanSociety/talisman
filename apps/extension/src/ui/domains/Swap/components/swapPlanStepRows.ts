import {
  type PlanCallToAction,
  type PlanStepStatus,
  planCallToAction,
  planSteps,
} from "@core/domains/swaps/plans/helpers"
import type { SwapPlan } from "@core/domains/swaps/plans/types"
import type { QuoteLeg } from "@core/domains/swaps/types"
import type { WalletTransaction, WalletTransactionEth } from "@core/domains/transactions/types"
import {
  getBlockExplorerUrl,
  type Network,
  networkIdFromTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"
import type { ProcessAnimationStatus } from "@ui/components/ProcessAnimation/ProcessAnimation"
import { getSwapTrackerUrl } from "@ui/domains/Swap/getSwapTrackerUrl"
import { shortenAddress } from "@ui/util/shortenAddress"

import { getSwapProgressDetails, type SwapStatusDetails } from "./swapProgressStatus"

type Translator = (key: string, options?: Record<string, unknown>) => string

/** "untracked" is a delivery Talisman can no longer follow, its outcome is not known */
export type SwapPlanStepStatus = PlanStepStatus | "untracked"

export type SwapPlanStepRow = {
  key: string
  label: string
  status: SwapPlanStepStatus
  detail: string
  href?: string
}

export type SwapPlanProgressView = {
  title: string
  subtitle: string
  animStatus: ProcessAnimationStatus
  steps: SwapPlanStepRow[]
}

export type StepRowContext = {
  t: Translator
  /** by normalised address */
  accounts: Readonly<Record<string, Pick<Account, "name" | "type"> | undefined>>
  networks: Readonly<Record<string, Network | undefined>>
}

type StepLeg = Pick<QuoteLeg, "protocol" | "fromTokenId" | "toTokenId" | "signer">

const accountName = ({ accounts }: StepRowContext, address: string | null) =>
  address ? (accounts[normalizeAddress(address)]?.name ?? shortenAddress(address)) : ""

const isLedger = ({ accounts }: StepRowContext, address: string | null) =>
  !!address && !!accounts[normalizeAddress(address)]?.type.startsWith("ledger-")

const networkOf = ({ networks }: StepRowContext, tokenId: TokenId) =>
  networks[networkIdFromTokenId(tokenId)]

const stepLabel = (ctx: StepRowContext, leg: StepLeg) => {
  if (leg.protocol === "bittensor-evm") return ctx.t("Move to EVM")
  if (networkIdFromTokenId(leg.fromTokenId) === networkIdFromTokenId(leg.toTokenId))
    return ctx.t("Swap")
  return ctx.t("Bridge to {{network}}", { network: networkOf(ctx, leg.toTokenId)?.name ?? "" })
}

/** the first leg is the one the user signs on screen, every later one is signed by the account the funds wait on */
const upcomingDetail = (ctx: StepRowContext, leg: StepLeg, index: number) => {
  const account = accountName(ctx, leg.signer)
  if (index === 0) return ctx.t("You sign this step from {{account}}", { account })
  return isLedger(ctx, leg.signer)
    ? ctx.t("Signed on your Ledger from {{account}}", { account })
    : ctx.t("Sent automatically from {{account}}", { account })
}

export const quoteStepRows = (ctx: StepRowContext, legs: readonly StepLeg[]): SwapPlanStepRow[] =>
  legs.map((leg, index) => ({
    key: String(index),
    label: stepLabel(ctx, leg),
    status: index === 0 ? "waiting-on-you" : "upcoming",
    detail: upcomingDetail(ctx, leg, index),
  }))

export const quoteRouteSummary = (ctx: StepRowContext, legs: readonly StepLeg[]) =>
  ctx.t("{{count}} steps, via {{account}}", {
    count: legs.length,
    account: accountName(ctx, legs[1]?.signer ?? null),
  })

export type SwapPlanProgressInput = {
  plan: SwapPlan
  /** the transaction rows of the legs that have a hash, by hash: null once the wallet no longer holds the row */
  rows: ReadonlyMap<string, WalletTransaction | null>
  /** why the transaction a Ledger leg waits on could not be prepared */
  ledgerError: string | null
}

type LegProgress = Pick<SwapPlanStepRow, "status" | "detail">

const legProgress = (
  ctx: StepRowContext,
  { plan, rows, ledgerError }: SwapPlanProgressInput,
  index: number
): LegProgress => {
  const { t } = ctx
  const leg = plan.legs[index]
  const account = accountName(ctx, leg.quote.signer)

  switch (leg.state.at) {
    case "queued":
      return { status: "upcoming", detail: upcomingDetail(ctx, leg.quote, index) }
    case "awaiting-user":
      return {
        status: "waiting-on-you",
        detail:
          leg.state.why === "unlock"
            ? t("Waiting for you to unlock Talisman")
            : (ledgerError ?? t("Waiting for your Ledger signature")),
      }
    case "building":
      return { status: "in-progress", detail: t("Preparing") }
    case "sent":
      return { status: "in-progress", detail: t("Sending from {{account}}", { account }) }
    case "landed": {
      const row = rows.get(leg.state.hash)
      const blockNumber = row && "blockNumber" in row ? row.blockNumber : undefined
      return {
        status: "done",
        detail: blockNumber
          ? t("In block #{{blockNumber}}", { blockNumber })
          : t("View on block explorer"),
      }
    }
    case "failed":
      return {
        status: "failed",
        detail:
          leg.state.failure === "cancelled"
            ? t("Cancelled. Your funds wait on {{account}}", { account })
            : leg.state.hash
              ? t("Did not complete. Check your activity")
              : t("Not sent. Your funds wait on {{account}}", { account }),
      }
    case "skipped":
      return { status: "skipped", detail: t("Skipped") }
  }
}

/** the last leg landing on its source chain only hands the funds over: the swap ends at their delivery */
const deliveryProgress = (ctx: StepRowContext, plan: SwapPlan, delivery: Delivery): LegProgress => {
  const network = networkOf(ctx, plan.legs[plan.legs.length - 1].quote.toTokenId)?.name ?? ""
  if (delivery.untracked)
    return { status: "untracked", detail: ctx.t("Check your balance on {{network}}", { network }) }
  switch (delivery.animStatus) {
    case "processing":
      return { status: "in-progress", detail: ctx.t("Arriving on {{network}}", { network }) }
    case "success":
      return { status: "done", detail: ctx.t("Arrived on {{network}}", { network }) }
    case "failure":
      return { status: "failed", detail: ctx.t("Did not complete. Check your activity") }
  }
}

type Delivery = SwapStatusDetails & { untracked: boolean }

const UNTRACKED_SWAP_STATUSES: ReadonlySet<WalletTransaction["swapStatus"]> = new Set([
  "invalid",
  "unknown",
])

const lastLegDelivery = (t: Translator, row: WalletTransaction | null | undefined): Delivery =>
  row === null
    ? {
        title: t("Swap status unknown"),
        subtitle: t("Talisman no longer tracks this swap. Please check your balance."),
        animStatus: "failure",
        untracked: true,
      }
    : {
        ...getSwapProgressDetails(t, row, true),
        untracked: row?.status === "unknown" || UNTRACKED_SWAP_STATUSES.has(row?.swapStatus),
      }

type ProgressHeader = Omit<SwapPlanProgressView, "steps">

const inProgressHeader = (t: Translator): ProgressHeader => ({
  title: t("Swap in progress"),
  subtitle: t("This may take a few minutes. You can close this window."),
  animStatus: "processing",
})

const progressHeader = (
  t: Translator,
  plan: SwapPlan,
  delivery: Delivery | null
): ProgressHeader => {
  const current = plan.legs.findIndex((leg) => leg.state.at !== "landed")

  switch (plan.phase) {
    case "proposed":
    case "running":
      return inProgressHeader(t)

    case "completed":
      if (!delivery || delivery.animStatus === "processing") return inProgressHeader(t)
      return {
        title: delivery.title,
        subtitle: delivery.subtitle,
        animStatus: delivery.animStatus,
      }

    case "paused": {
      const waiting = plan.legs[current]?.state
      const step = current + 1
      return waiting?.at === "awaiting-user" && waiting.why === "hardware"
        ? {
            title: t("Sign step {{step}} on your Ledger", { step }),
            subtitle: t("Your swap continues once you sign step {{step}}.", { step }),
            animStatus: "processing",
          }
        : {
            title: t("Unlock to continue"),
            subtitle: t("Step {{step}} is sent once Talisman is unlocked.", { step }),
            animStatus: "processing",
          }
    }

    case "stopped": {
      const failed = plan.legs.find((leg) => leg.state.at === "failed")?.state
      return {
        title: current
          ? t("Swap stopped after step {{step}}", { step: current })
          : t("Swap stopped"),
        subtitle:
          failed?.at === "failed" && (failed.failure === "cancelled" || !failed.hash)
            ? t("Your funds wait on your account at the end of step {{step}}.", { step: current })
            : t("Step {{step}} did not complete. Check your activity for its status.", {
                step: current + 1,
              }),
        animStatus: "failure",
      }
    }

    case "aborted":
      return {
        title: t("Swap cancelled"),
        subtitle: t("Step 1 did not go through. Your funds did not move."),
        animStatus: "failure",
      }
  }
}

const lastLegRow = ({ plan, rows }: Pick<SwapPlanProgressInput, "plan" | "rows">) => {
  const hash = planSteps(plan).at(-1)?.hash
  return hash ? rows.get(hash) : undefined
}

export const swapPlanProgressView = (
  ctx: StepRowContext,
  input: SwapPlanProgressInput
): SwapPlanProgressView => {
  const { plan } = input
  const lastIndex = plan.legs.length - 1
  const delivery =
    plan.legs[lastIndex].state.at === "landed" ? lastLegDelivery(ctx.t, lastLegRow(input)) : null

  return {
    ...progressHeader(ctx.t, plan, delivery),
    steps: planSteps(plan).map(({ leg: index, hash }) => {
      const leg = plan.legs[index]
      const network = networkOf(ctx, leg.quote.fromTokenId)
      const href = hash
        ? (getBlockExplorerUrl(network, { type: "transaction", id: hash }) ?? undefined)
        : undefined
      return {
        key: String(index),
        label: stepLabel(ctx, leg.quote),
        ...(index === lastIndex && delivery
          ? deliveryProgress(ctx, plan, delivery)
          : legProgress(ctx, input, index)),
        href,
      }
    }),
  }
}

export type SwapPlanFooterAction =
  | { type: "replace"; tx: WalletTransactionEth }
  | { type: "track"; url: string }
  | { type: "none" }
  | PlanCallToAction

const pendingEvmLegRow = ({ plan, rows }: Pick<SwapPlanProgressInput, "plan" | "rows">) =>
  planSteps(plan)
    .map(({ hash }) => (hash ? rows.get(hash) : null))
    .find(
      (row): row is WalletTransactionEth => row?.platform === "ethereum" && row.status === "pending"
    )

/** while the swap moves, the footer follows it; once it waits or ends, it offers the way forward */
export const swapPlanFooterAction = (
  input: Pick<SwapPlanProgressInput, "plan" | "rows">
): SwapPlanFooterAction => {
  switch (input.plan.phase) {
    case "proposed":
    case "running":
    case "completed": {
      const pending = pendingEvmLegRow(input)
      if (pending) return { type: "replace", tx: pending }
      const row = lastLegRow(input)
      const url = row ? getSwapTrackerUrl(row.txInfo, row.id) : null
      return url ? { type: "track", url } : { type: "none" }
    }
    case "paused":
    case "stopped":
    case "aborted":
      return planCallToAction(input.plan)
  }
}
