import { cn } from "@talismn/util"
import { type FC, useState } from "react"
import { SwapTabContentBuy } from "./SwapTabContentBuy"
import { SwapTabs, type TaoDashboardSwapTabs } from "./SwapTabs"

export const TaoDashboardSwap: FC<{ netuid: number; className?: string }> = ({
  netuid,
  className,
}) => {
  const [mode, setMode] = useState<TaoDashboardSwapTabs>("buy")

  return (
    <div className={cn("flex size-full flex-col overflow-hidden", className)}>
      {/* Tab Header - Buy/Sell */}
      <SwapTabs selected={mode} onSelect={setMode} />
      {/* Tab Contents - Buy/Sell */}
      <div className="w-full grow overflow-hidden bg-grey-850">
        {mode === "buy" && <SwapTabContentBuy netuid={netuid} />}
      </div>
    </div>
  )
}
