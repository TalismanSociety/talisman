import { ModalDialog } from "@ui/components/ModalDialog"
import type { ReplacementCallbackArgs } from "@ui/domains/Transactions/TxProgress"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSwapModal } from "../hooks/useSwapModal"
import { useSwap } from "../SwapProvider"
import { SWAP_CONFIRM_CONTAINER_ID, SwapConfirm } from "./SwapConfirm"
import { SwapForm, SwapFormShimmer } from "./SwapForm"
import { SwapPlanTransactions } from "./SwapPlanTransactions"
import { SwapProgress } from "./SwapProgress"

export const SwapWizard = () => {
  const { swapView, isInitializing } = useSwap()

  switch (swapView) {
    case "form":
    case "approve-recipient":
      return isInitializing ? <SwapFormShimmer /> : <SwapForm />
    case "confirm":
      return <SwapConfirm />
    case "submitted":
      return <SwapSubmitted />
  }
}

const SwapSubmitted = () => {
  const { t } = useTranslation()
  const { submittedTxHash, submittedNetworkId, submittedTxInfo, gotoSubmitted, approvalHash } =
    useSwap()
  const { close: closeSwapTokensModal } = useSwapModal()

  // Follow speed-up replacements so tracking continues on the new hash. If the
  // original still wins the nonce race, SwapProgress redirects to the mined tx
  // via getCanonicalTransaction.
  // Cancels keep tracking the original hash, which flips to "replaced" (cancelled UI).
  const handleReplacementComplete = useCallback(
    ({ txId, networkId, replaceType }: ReplacementCallbackArgs) => {
      if (replaceType !== "speed-up" || !submittedTxInfo) return
      gotoSubmitted({ hash: txId, networkId, txInfo: submittedTxInfo })
    },
    [gotoSubmitted, submittedTxInfo]
  )

  if (!submittedTxHash || !submittedNetworkId || !submittedTxInfo) return null

  if (submittedTxInfo.plan)
    return (
      <ModalDialog
        variant="wizard"
        className="size-full border-none"
        title={t("Confirm")}
        onCloseClick={closeSwapTokensModal}
        contentClassName="relative flex flex-col overflow-hidden! p-0!"
        id={SWAP_CONFIRM_CONTAINER_ID}
      >
        <SwapPlanTransactions
          id={submittedTxInfo.plan.id}
          onClose={closeSwapTokensModal}
          containerId={SWAP_CONFIRM_CONTAINER_ID}
          leg0ApprovalHash={approvalHash ?? undefined}
        />
      </ModalDialog>
    )

  return (
    <SwapProgress
      hash={submittedTxHash}
      networkId={submittedNetworkId}
      txInfo={submittedTxInfo}
      onClose={closeSwapTokensModal}
      onReplacementComplete={handleReplacementComplete}
    />
  )
}
