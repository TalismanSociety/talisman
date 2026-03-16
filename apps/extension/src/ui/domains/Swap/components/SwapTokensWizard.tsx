import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { useSwap } from "../SwapProvider"
import { SwapConfirm } from "./SwapConfirm"
import { SwapForm, SwapFormShimmer } from "./SwapForm"
import { SwapProgress } from "./SwapProgress"

export const SwapTokensWizard = () => {
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
  const { submittedTxHash, submittedNetworkId, submittedTxInfo } = useSwap()
  const { close: closeSwapTokensModal } = useSwapTokensModal()

  if (!submittedTxHash || !submittedNetworkId || !submittedTxInfo) return null

  return (
    <SwapProgress
      hash={submittedTxHash}
      networkId={submittedNetworkId}
      txInfo={submittedTxInfo}
      onClose={closeSwapTokensModal}
    />
  )
}
