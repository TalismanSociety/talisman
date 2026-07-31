import type { ReplacementCallbackArgs } from "@ui/domains/Transactions/TxProgress"
import { useCallback } from "react"
import { useSwapModal } from "../hooks/useSwapModal"
import { useSwap } from "../SwapProvider"
import { SwapConfirm } from "./SwapConfirm"
import { SwapForm, SwapFormShimmer } from "./SwapForm"
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
  const { submittedTxHash, submittedNetworkId, submittedTxInfo, gotoSubmitted } = useSwap()
  const { close: closeSwapTokensModal } = useSwapModal()

  // Follow speed-up replacements so tracking continues on the new hash.
  // Cancels keep tracking the original hash, which flips to "replaced" (cancelled UI).
  const handleReplacementComplete = useCallback(
    ({ txId, networkId, replaceType }: ReplacementCallbackArgs) => {
      if (replaceType !== "speed-up" || !submittedTxInfo) return
      gotoSubmitted({ hash: txId, networkId, txInfo: submittedTxInfo })
    },
    [gotoSubmitted, submittedTxInfo]
  )

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
