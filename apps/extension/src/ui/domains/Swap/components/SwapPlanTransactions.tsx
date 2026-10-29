import { db } from "@core/db"
import { fromPersistedLeg, planSteps } from "@core/domains/swaps/plans/helpers"
import type { SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import type { WalletTransaction } from "@core/domains/transactions/types"
import { ExternalLinkIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { TxReplaceActions } from "@ui/domains/Transactions/TxProgress"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { Hex } from "viem"

import { useLaterLegApprovals } from "../hooks/useLegApprovals"
import { useSwapModal } from "../hooks/useSwapModal"
import { swapModules } from "../swaps.api"
import { SwapOtherFees } from "./SwapOtherFees"
import {
  PlanLegSignButton,
  type PlanLegSigningState,
  usePlanLegSigning,
} from "./SwapPlanLedgerSign"
import { SwapTxCards, useSwapTxContext } from "./SwapTxCard"
import {
  SwapApprovalDetails,
  SwapLegDetails,
  SwapSlippageRow,
  SwapTxFeeRows,
} from "./SwapTxDetails"
import { SwapTxLayout, SwapTxSummary } from "./SwapTxSummary"
import {
  legTrackerUrl,
  pendingEvmLegRow,
  planSigningLeg,
  type SwapPlanFooter,
  type SwapPlanTxInput,
  type SwapTxCardModel,
  swapPlanFooter,
  swapPlanTxFacts,
  swapTxCards,
  withBlockingError,
} from "./swapTxCards"

const usePlan = (id: SwapPlanId) =>
  useLiveQuery(async () => (await db.swapPlans.get(id)) ?? null, [id])

const useLegRows = (plan: SwapPlan | null | undefined) => {
  const hashes = useMemo(
    () => (plan ? planSteps(plan).flatMap((step) => (step.hash ? [step.hash] : [])) : []),
    [plan]
  )
  return useLiveQuery(
    async () => {
      const rows = await db.transactionsV2.bulkGet(hashes)
      return new Map(hashes.map((hash, index) => [hash, rows[index] ?? null]))
    },
    [hashes],
    new Map<string, WalletTransaction | null>()
  )
}

const supportsSlippage = (protocol: SwapPlan["summary"]["protocol"]) =>
  swapModules.find((module) => module.protocol === protocol)?.supportsSlippageSetting === true

const PlanFooter: FC<{
  footer: SwapPlanFooter
  signButton: PlanLegSigningState["button"]
  onClose: () => void
  containerId?: string
}> = ({ footer, signButton, onClose, containerId }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open: openSwapModal } = useSwapModal()

  const checkActivity = useCallback(() => {
    onClose()
    navigate("/tx-history")
  }, [navigate, onClose])

  switch (footer.type) {
    case "processing":
      return (
        <Button primary fullWidth processing>
          {t("Processing")}
        </Button>
      )
    case "close":
      return (
        <Button primary fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      )
    case "unlock":
      return (
        <Button primary fullWidth onClick={() => api.promptLogin()}>
          {t("Unlock")}
        </Button>
      )
    case "sign-hardware":
      return <PlanLegSignButton button={signButton} containerId={containerId} />
    case "finish":
      return (
        <Button
          primary
          fullWidth
          onClick={() => openSwapModal({ entry: "swap_plan", ...footer.offer })}
        >
          {t("Finish the swap")}
        </Button>
      )
    case "check-activity":
      return (
        <Button primary fullWidth onClick={checkActivity}>
          {t("Check activity")}
        </Button>
      )
  }
}

const PlanTransactions: FC<{
  plan: SwapPlan
  rows: SwapPlanTxInput["rows"]
  leg0ApprovalHash?: Hex
  onClose: () => void
  containerId?: string
}> = ({ plan, rows, leg0ApprovalHash, onClose, containerId }) => {
  const { t } = useTranslation()
  const ctx = useSwapTxContext()
  const legSigning = usePlanLegSigning(plan, planSigningLeg(plan))

  const legs = useMemo(() => plan.legs.map((leg) => fromPersistedLeg(leg.quote)), [plan.legs])
  const approvalChecks = useMemo(
    () =>
      plan.legs.map((leg, index) => ({
        leg: legs[index],
        enabled: leg.state.at === "queued" || leg.state.at === "awaiting-user",
      })),
    [legs, plan.legs]
  )
  const approvalsNeeded = useLaterLegApprovals(approvalChecks)

  const { signing, blockingError } = legSigning
  const input = useMemo<SwapPlanTxInput>(
    () => ({ plan, rows, leg0ApprovalHash, approvalsNeeded, signing }),
    [approvalsNeeded, leg0ApprovalHash, plan, rows, signing]
  )
  const cards = useMemo(
    () => withBlockingError(swapTxCards(swapPlanTxFacts(ctx, input)), blockingError),
    [blockingError, ctx, input]
  )
  const lastIndex = plan.legs.length - 1

  const renderBody = (card: SwapTxCardModel) => {
    const leg = legs[card.leg]
    const signs = card.kind === "approval" ? "approval" : "leg"
    const isSigned = signing?.leg === card.leg && signing.signs === signs && !!legSigning.ethTx
    const feeRows = isSigned ? (
      <SwapTxFeeRows
        address={leg.signer}
        feeTokenId={legSigning.feeTokenId}
        feePlanck={legSigning.ethTx?.txDetails?.estimatedFee ?? null}
        isLoading={!!legSigning.ethTx?.isLoading}
        hasError={!!legSigning.ethTx?.error && !legSigning.ethTx.txDetails}
        ethTx={legSigning.ethTx}
        containerId={containerId}
      />
    ) : null

    if (card.kind === "approval")
      return (
        <SwapApprovalDetails tokenId={leg.fromTokenId} amount={leg.inputAmount} fee={feeRows} />
      )

    const state = plan.legs[card.leg].state
    const pendingRow = pendingEvmLegRow(input, card.leg)
    const trackerUrl = legTrackerUrl(input, card.leg)
    return (
      <SwapLegDetails
        leg={leg}
        received={state.at === "landed" && card.leg < lastIndex ? BigInt(state.amount) : undefined}
      >
        {leg.protocol === plan.summary.protocol && supportsSlippage(leg.protocol) ? (
          <SwapSlippageRow percent={plan.summary.slippage * 100} />
        ) : null}
        {feeRows}
        <SwapOtherFees fees={leg.fees} isLoading={false} />
        {pendingRow ? (
          <TxReplaceActions tx={pendingRow} className="mt-0" containerId={containerId} />
        ) : null}
        {trackerUrl ? (
          <a
            href={trackerUrl}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 self-start text-primary text-xs hover:opacity-80"
          >
            {t("Track swap progress")}
            <ExternalLinkIcon />
          </a>
        ) : null}
      </SwapLegDetails>
    )
  }

  return (
    <SwapTxLayout
      footer={
        <PlanFooter
          footer={swapPlanFooter(plan, cards)}
          signButton={legSigning.button}
          onClose={onClose}
          containerId={containerId}
        />
      }
    >
      <SwapTxSummary
        fromTokenId={plan.summary.fromTokenId}
        toTokenId={plan.summary.toTokenId}
        fromAmount={BigInt(plan.summary.fromAmount)}
        toAmount={BigInt(plan.summary.quotedOutput)}
        fromAddress={plan.legs[0].quote.signer}
        toAddress={plan.summary.recipient}
      />
      <SwapTxCards cards={cards} legs={legs} renderBody={renderBody} />
    </SwapTxLayout>
  )
}

/** a plan's transactions as they run, each in its own card, from any screen that opens the plan */
export const SwapPlanTransactions: FC<{
  id: SwapPlanId
  onClose: () => void
  containerId?: string
  /** only the screen that sent the first leg's approval knows it */
  leg0ApprovalHash?: Hex
}> = ({ id, ...props }) => {
  const plan = usePlan(id)
  const rows = useLegRows(plan)
  if (!plan) return null
  return <PlanTransactions plan={plan} rows={rows} {...props} />
}
