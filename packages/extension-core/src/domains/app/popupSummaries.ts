import { trackBalanceTotals } from "../balances/utils"
import { trackStakingBannerDisplay } from "../staking/utils"

export const trackPopupSummaryData = async () => {
  return Promise.all([trackBalanceTotals(), trackStakingBannerDisplay()])
}
