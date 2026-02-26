import type { FC } from "react"
import { SignalsHolderOverview } from "./SignalsHoldersOverview"
import { SignalsSentimentTrend } from "./SignalsSentimentTrend"
import { SignalsTradeFlow } from "./SignalsTradeFlow"

export const TabSignals: FC<{ netuid: number }> = ({ netuid }) => (
  <div className="flex h-full flex-col gap-6 overflow-y-auto">
    <SignalsSentimentTrend netuid={netuid} />
    <SignalsTradeFlow netuid={netuid} />
    <SignalsHolderOverview netuid={netuid} />
  </div>
)
