import { FC } from "react"

import { TaoDashboardSubnetBreadcrumb } from "./TaoDashboardSubnetBreadcrumb"
import { TaoDashboardSubnetPickerModal } from "./TaoDashboardSubnetPickerModal"

export const TaoDashboardSubnetTradingUI: FC<{ netuid: number }> = ({ netuid }) => {
  return (
    <div>
      <TaoDashboardSubnetBreadcrumb netuid={netuid} />
      <TaoDashboardSubnetPickerModal />
    </div>
  )
}
