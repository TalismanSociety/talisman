import { cn } from "@talismn/util"
import { type FC, useState } from "react"
import { BITTENSOR_SWAP_CONTAINER_ID } from "./common"
import { SwapBuyTabContent } from "./SwapBuyTabContent"
import { SwapSellTabContent } from "./SwapSellTabContent"
import { SwapTabs, type TaoDashboardSwapTabs } from "./SwapTabs"

export const TaoDashboardSwap: FC<{ netuid: number; className?: string }> = ({
  netuid,
  className,
}) => {
  const [mode, setMode] = useState<TaoDashboardSwapTabs>("buy")

  return (
    <div
      id={BITTENSOR_SWAP_CONTAINER_ID} // used by hardware wallet drawers
      className={cn("relative flex size-full flex-col overflow-hidden", className)}
    >
      {/* Tab Header - Buy/Sell */}
      <SwapTabs selected={mode} onSelect={setMode} />
      {/* Tab Contents - Buy/Sell */}
      <div className="w-full grow overflow-hidden bg-grey-850">
        {mode === "buy" && <SwapBuyTabContent netuid={netuid} />}
        {mode === "sell" && <SwapSellTabContent netuid={netuid} />}
      </div>
    </div>
  )
}
