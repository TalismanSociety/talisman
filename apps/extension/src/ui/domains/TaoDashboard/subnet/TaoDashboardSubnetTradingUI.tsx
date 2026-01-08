import { FC } from "react"

import { TaoDashboardSubnetBreadcrumb } from "./TaoDashboardSubnetBreadcrumb"

export const TaoDashboardSubnetTradingUI: FC<{ netuid: number }> = ({ netuid }) => {
  return (
    <div>
      <TaoDashboardSubnetBreadcrumb netuid={netuid} />
    </div>
  )
}
