import type { FC } from "react"
import { SignalsHolderOverview } from "./SignalsHoldersOverview"
import { SignalsTradeFlow } from "./SignalsTradeFlow"
import { SignalsTrendingSentiment } from "./SignalsTrendingSentiment"

export const TabSignals: FC<{ netuid: number }> = ({ netuid }) => (
  <div className="flex flex-col gap-6 overflow-y-auto">
    <SignalsTrendingSentiment netuid={netuid} />
    <SignalsTradeFlow netuid={netuid} />
    <SignalsHolderOverview netuid={netuid} />
    {/* <TradeFlowSection netuid={netuid} />
    <_HoldersOverviewSection netuid={netuid} /> */}
  </div>
)
