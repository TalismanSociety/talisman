import { trackBalanceTotals } from "../balances/store.BalanceTotals"
import { trackStakingBannerDisplay } from "../staking/store.StakingBanners"

export const trackPopupSummaryData = async () => {
  return Promise.all([trackBalanceTotals(), trackStakingBannerDisplay()])
}
