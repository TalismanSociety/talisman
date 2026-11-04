import { ModalDialog } from "@ui/components/ModalDialog"
import type { ReplacementCallbackArgs } from "@ui/domains/Transactions/TxProgress"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSwapModal } from "../hooks/useSwapModal"
import { useSwap } from "../SwapProvider"
import type { SwapRun } from "../swap-modules/swap-run"
import { SWAP_CONFIRM_CONTAINER_ID, SwapConfirm } from "./SwapConfirm"
import { SwapForm, SwapFormShimmer } from "./SwapForm"
import { SwapProgress } from "./SwapProgress"
import { SwapRunView } from "./SwapRunView"

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

const SwapRunDialog: FC<{ run: SwapRun }> = ({ run }) => {
  const { t } = useTranslation()
  const { legSent, approvalHash } = useSwap()
  const { close } = useSwapModal()

  return (
    <ModalDialog
      variant="wizard"
      className="size-full border-none"
      title={t("Confirm")}
      onCloseClick={close}
      contentClassName="relative flex flex-col overflow-hidden! p-0!"
      id={SWAP_CONFIRM_CONTAINER_ID}
    >
      <SwapRunView
        run={run}
        leg0ApprovalHash={approvalHash}
        onLegSent={legSent}
        onClose={close}
        containerId={SWAP_CONFIRM_CONTAINER_ID}
      />
    </ModalDialog>
  )
}

const SwapSubmitted = () => {
  const { run, submittedTxHash, submittedNetworkId, submittedTxInfo, gotoSubmitted } = useSwap()
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

  if (run) return <SwapRunDialog run={run} />
  if (!submittedTxHash || !submittedNetworkId || !submittedTxInfo) return null

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
