import { Suspense } from "react"
import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { useSwap } from "../SwapProvider"
import { SwapConfirm } from "./SwapConfirm"
import { SwapForm } from "./SwapForm"
import { SwapFormShimmer } from "./SwapFormShimmer"
import { SwapHeader } from "./SwapHeader"
import { SwapProgress, SwapProgressFallback } from "./SwapProgress"

export const SwapTokensWizard = () => {
  const { swapView, isInitializing } = useSwap()
  const { close: closeSwapTokensModal } = useSwapTokensModal()

  return (
    <div className="relative flex h-full w-full flex-col gap-4">
      <SwapHeader />
      {(() => {
        switch (swapView) {
          case "form":
          case "approve-recipient":
            return isInitializing ? <SwapFormShimmer /> : <SwapForm />
          case "confirm":
            return <SwapConfirm />
          case "submitted":
            return (
              <Suspense fallback={<SwapProgressFallback onClose={closeSwapTokensModal} />}>
                <SwapSubmitted />
              </Suspense>
            )
        }
      })()}
    </div>
  )
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
