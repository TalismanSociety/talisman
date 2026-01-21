import { cn } from "@talismn/util"
import { type FC, useState } from "react"
import { BITTENSOR_SWAP_CONTAINER_ID } from "./common"
import { SwapTabContentBuy } from "./SwapTabContentBuy"
import { SwapTabContentSell } from "./SwapTabContentSell"
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
        {mode === "buy" && <SwapTabContentBuy netuid={netuid} />}
        {mode === "sell" && <SwapTabContentSell netuid={netuid} />}
      </div>
    </div>
  )
}
