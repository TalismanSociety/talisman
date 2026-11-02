import type { SwapPlanId } from "@core/domains/swaps/plans/types"
import { ModalDialog } from "@ui/components/ModalDialog"
import type { ReplacementCallbackArgs } from "@ui/domains/Transactions/TxProgress"
import { type FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { useSwapModal } from "../hooks/useSwapModal"
import { useSwap } from "../SwapProvider"
import { SWAP_CONFIRM_CONTAINER_ID, SwapConfirm } from "./SwapConfirm"
import { SwapForm, SwapFormShimmer } from "./SwapForm"
import { SwapPlanTransactions } from "./SwapPlanTransactions"
import { SwapProgress } from "./SwapProgress"

export const SwapWizard = () => {
  const { swapView, isInitializing } = useSwap()
  const [continuedPlanId, setContinuedPlanId] = useState<SwapPlanId | null>(null)
  const backToForm = useCallback(() => setContinuedPlanId(null), [])

  switch (swapView) {
    case "form":
    case "approve-recipient":
      if (isInitializing) return <SwapFormShimmer />
      if (continuedPlanId) return <SwapPlanDialog id={continuedPlanId} onClose={backToForm} />
      return <SwapForm onContinuePlan={setContinuedPlanId} />
    case "confirm":
      return <SwapConfirm />
    case "submitted":
      return <SwapSubmitted />
  }
}

const SwapPlanDialog: FC<{ id: SwapPlanId; onClose: () => void; leg0ApprovalHash?: Hex }> = ({
  id,
  onClose,
  leg0ApprovalHash,
}) => {
  const { t } = useTranslation()
  return (
    <ModalDialog
      variant="wizard"
      className="size-full border-none"
      title={t("Confirm")}
      onCloseClick={onClose}
      contentClassName="relative flex flex-col overflow-hidden! p-0!"
      id={SWAP_CONFIRM_CONTAINER_ID}
    >
      <SwapPlanTransactions
        id={id}
        onClose={onClose}
        containerId={SWAP_CONFIRM_CONTAINER_ID}
        leg0ApprovalHash={leg0ApprovalHash}
      />
    </ModalDialog>
  )
}

const SwapSubmitted = () => {
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
      <SwapPlanDialog
        id={submittedTxInfo.plan.id}
        onClose={closeSwapTokensModal}
        leg0ApprovalHash={approvalHash ?? undefined}
      />
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
