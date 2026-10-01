import { DashboardNfts } from "@ui/domains/Portfolio/Nfts/DashboardNfts"
import { NftsUnavailable } from "@ui/domains/Portfolio/Nfts/NftsUnavailable"
import { useFeatureFlag } from "@ui/state/remoteConfig"

export const PortfolioNfts = () => {
  const showNfts = useFeatureFlag("NFTS_V2")

  return showNfts ? <DashboardNfts /> : <NftsUnavailable />
}
