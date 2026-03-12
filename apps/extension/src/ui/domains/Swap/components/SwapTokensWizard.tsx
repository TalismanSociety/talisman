import { useSwap } from "../SwapProvider"
import { SwapConfirm } from "./SwapConfirm"
import { SwapForm } from "./SwapForm"
import { SwapFormShimmer } from "./SwapFormShimmer"
import { SwapHeader } from "./SwapHeader"

export const SwapTokensWizard = () => {
  const { swapView, isInitializing } = useSwap()

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
        }
      })()}
    </div>
  )
}
