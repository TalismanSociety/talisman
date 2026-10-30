import { db } from "@core/db"
import { fromPersistedLeg, planSteps } from "@core/domains/swaps/plans/helpers"
import type { SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import type { WalletTransaction } from "@core/domains/transactions/types"
import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { TxReplaceActions } from "@ui/domains/Transactions/TxProgress"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useCallback, useMemo, useState } from "react"
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
import { SwapTxCards, SwapTxLayout, useSwapTxContext } from "./SwapTxCard"
import {
  SwapApprovalDetails,
  SwapLegDetails,
  SwapSlippageRow,
  SwapTxFeeRows,
  SwapTxSentFeeRows,
} from "./SwapTxDetails"
import { SwapTxSummary } from "./SwapTxSummary"
import {
  legTrackerUrl,
  type PlanLegSigning,
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

const useApprovalHashes = (leg0ApprovalHash: Hex | undefined, signing: PlanLegSigning | null) => {
  const [seen, setSeen] = useState<Readonly<Partial<Record<number, Hex>>>>({})
  if (signing?.approvalHash && seen[signing.leg] !== signing.approvalHash)
    setSeen({ ...seen, [signing.leg]: signing.approvalHash })
  return useMemo(
    () => (leg0ApprovalHash ? { ...seen, 0: leg0ApprovalHash } : seen),
    [leg0ApprovalHash, seen]
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
  const approvalHashes = useApprovalHashes(leg0ApprovalHash, signing)
  const input = useMemo<SwapPlanTxInput>(
    () => ({ plan, rows, approvalHashes, approvalsNeeded, signing }),
    [approvalHashes, approvalsNeeded, plan, rows, signing]
  )
  const cards = useMemo(
    () => withBlockingError(swapTxCards(swapPlanTxFacts(ctx, input)), blockingError),
    [blockingError, ctx, input]
  )
  const lastIndex = plan.legs.length - 1
  const providerLeg = plan.legs.findIndex((leg) => leg.quote.protocol === plan.summary.protocol)

  const renderBody = (card: SwapTxCardModel) => {
    const signs = card.kind === "approval" ? "approval" : "leg"
    const isSigned = signing?.leg === card.leg && signing.signs === signs && !!legSigning.ethTx
    const leg =
      isSigned && legSigning.built ? { ...legs[card.leg], ...legSigning.built } : legs[card.leg]
    const isRetried = isSigned && card.status === "failed"
    const feeRows =
      card.hash && !isRetried ? (
        <SwapTxSentFeeRows hash={card.hash} networkId={networkIdFromTokenId(leg.fromTokenId)} />
      ) : isSigned ? (
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

    if (card.kind === "approval") {
      const request = isSigned ? legSigning.button.request : undefined
      const isRevoke = request?.signs === "approval" && request.step === "revoke"
      return (
        <SwapApprovalDetails
          tokenId={leg.fromTokenId}
          amount={leg.inputAmount}
          fee={feeRows}
          note={
            isRevoke
              ? t(
                  "This token requires the existing approval to be revoked before a new one can be set. You will need to approve again after revoking."
                )
              : undefined
          }
        />
      )
    }

    const state = plan.legs[card.leg].state
    const pendingRow = pendingEvmLegRow(input, card.leg)
    const trackerUrl = legTrackerUrl(input, card.leg)
    return (
      <SwapLegDetails
        leg={leg}
        provider={card.leg === providerLeg ? plan.summary.provider : undefined}
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
