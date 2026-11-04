import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { getCanonicalTransaction } from "@ui/domains/Transactions/getCanonicalTransaction"
import { TxReplaceActions } from "@ui/domains/Transactions/TxProgress"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { Hex } from "viem"

import { useLaterLegApprovals } from "../hooks/useLegApprovals"
import { useSwapModal } from "../hooks/useSwapModal"
import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"
import { readyLeg, type SwapRun } from "../swap-modules/swap-run"
import { swapModules } from "../swaps.api"
import { SwapOtherFees } from "./SwapOtherFees"
import { LegSignButton, type LegSigningState, useLegSigning } from "./SwapRunLegSigning"
import { SwapTxCards, SwapTxLayout, useSwapTxContext } from "./SwapTxCard"
import {
  SwapApprovalDetails,
  SwapLegDetails,
  SwapRateDropNotice,
  SwapRiskRow,
  SwapSlippageRow,
  SwapTxFeeRows,
  type SwapTxProvider,
  SwapTxSentFeeRows,
} from "./SwapTxDetails"
import { SwapTxSummary } from "./SwapTxSummary"
import {
  legTrackerUrl,
  pendingEvmLegRow,
  type SwapRunFooter,
  type SwapRunTxInput,
  type SwapTxCardModel,
  swapRunFooter,
  swapRunTxFacts,
  swapTxCards,
  withBlockingError,
} from "./swapTxCards"

const useLegRows = (run: SwapRun): SwapRunTxInput["rows"] => {
  const hashes = useMemo(
    () => run.legs.map((leg) => ("hash" in leg ? leg.hash : undefined)),
    [run.legs]
  )
  return useLiveQuery(
    () => Promise.all(hashes.map((hash) => (hash ? getCanonicalTransaction(hash) : undefined))),
    [hashes],
    []
  )
}

const supportsSlippage = (protocol: SupportedSwapProtocol) =>
  swapModules.find((module) => module.protocol === protocol)?.supportsSlippageSetting === true

const RunFooter: FC<{
  footer: SwapRunFooter
  signButton: LegSigningState["button"]
  onClose: () => void
  containerId: string
}> = ({ footer, signButton, onClose, containerId }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open: openSwapModal } = useSwapModal()

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
    case "sign":
      return <LegSignButton button={signButton} containerId={containerId} />
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
        <Button
          primary
          fullWidth
          onClick={() => {
            onClose()
            navigate("/tx-history")
          }}
        >
          {t("Check activity")}
        </Button>
      )
  }
}

/** the legs of a multi-leg swap, each signed by the user once the previous one landed */
export const SwapRunView: FC<{
  run: SwapRun
  /** the first leg's approval, sent from the confirm screen */
  leg0ApprovalHash: Hex | null
  onLegSent: (index: number, hash: Hex, input: bigint) => void
  onClose: () => void
  containerId: string
}> = ({ run, leg0ApprovalHash, onLegSent, onClose, containerId }) => {
  const { t } = useTranslation()
  const ctx = useSwapTxContext()
  const rows = useLegRows(run)
  const legSigning = useLegSigning(run, readyLeg(run), onLegSent)
  const { signing, blockingError } = legSigning
  const legs = run.quote.legs

  const approvalChecks = useMemo(
    () =>
      legs.map((leg, index) => ({
        leg,
        enabled: ["queued", "ready"].includes(run.legs[index].at),
      })),
    [legs, run.legs]
  )
  const approvalsNeeded = useLaterLegApprovals(approvalChecks)
  const approvalHashes = useMemo(
    () =>
      leg0ApprovalHash
        ? { ...legSigning.approvalHashes, 0: leg0ApprovalHash }
        : legSigning.approvalHashes,
    [leg0ApprovalHash, legSigning.approvalHashes]
  )

  const signRequest = legSigning.button.request
  const riskAnalysis = useEvmTransactionRiskAnalysis({
    networkId: signRequest?.tx.networkId,
    tx: signRequest?.tx.payload,
    disableCriticalPane: true,
    subjectId: signing ? `${signing.leg}:${signing.signs}` : undefined,
  })

  const input = useMemo<SwapRunTxInput>(
    () => ({ run, rows, approvalHashes, approvalsNeeded, signing }),
    [approvalHashes, approvalsNeeded, rows, run, signing]
  )
  const cards = useMemo(
    () => withBlockingError(swapTxCards(swapRunTxFacts(ctx, input)), blockingError),
    [blockingError, ctx, input]
  )

  const { quote } = run
  const lastIndex = legs.length - 1
  const providerLeg = legs.findIndex((leg) => leg.protocol === quote.protocol)
  const provider: SwapTxProvider = {
    name: quote.providerName,
    logo: quote.providerLogo,
    note: quote.note,
    notice: quote.notice,
  }

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
    const riskRow = isSigned ? <SwapRiskRow /> : null

    if (card.kind === "approval") {
      const request = isSigned ? signRequest : undefined
      return (
        <SwapApprovalDetails
          tokenId={leg.fromTokenId}
          amount={leg.inputAmount}
          fee={feeRows}
          note={
            request?.signs === "approval" && request.step === "revoke"
              ? t(
                  "This token requires the existing approval to be revoked before a new one can be set. You will need to approve again after revoking."
                )
              : undefined
          }
        >
          {riskRow}
        </SwapApprovalDetails>
      )
    }

    const state = run.legs[card.leg]
    const pendingRow = pendingEvmLegRow(input, card.leg)
    const trackerUrl = legTrackerUrl(input, card.leg)
    const acceptedOutput = isSigned ? legSigning.built?.acceptedOutput : undefined
    return (
      <SwapLegDetails
        leg={leg}
        provider={card.leg === providerLeg ? provider : undefined}
        received={state.at === "landed" && card.leg < lastIndex ? state.amount : undefined}
      >
        {leg.protocol === quote.protocol && supportsSlippage(leg.protocol) ? (
          <SwapSlippageRow percent={run.slippage * 100} />
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
        {riskRow}
        {acceptedOutput !== undefined && leg.outputAmount < acceptedOutput ? (
          <SwapRateDropNotice
            tokenId={leg.toTokenId}
            amount={leg.outputAmount}
            accepted={acceptedOutput}
          />
        ) : null}
      </SwapLegDetails>
    )
  }

  return (
    <RiskAnalysisProvider riskAnalysis={riskAnalysis} containerId={containerId}>
      <SwapTxLayout
        footer={
          <RunFooter
            footer={swapRunFooter(run, cards)}
            signButton={legSigning.button}
            onClose={onClose}
            containerId={containerId}
          />
        }
      >
        <SwapTxSummary
          fromTokenId={legs[0].fromTokenId}
          toTokenId={legs[lastIndex].toTokenId}
          fromAmount={quote.inputAmountBN}
          toAmount={quote.outputAmountBN}
          fromAddress={legs[0].signer ?? ""}
          toAddress={legs[lastIndex].recipient ?? ""}
        />
        <SwapTxCards cards={cards} legs={legs} renderBody={renderBody} />
      </SwapTxLayout>
    </RiskAnalysisProvider>
  )
}
