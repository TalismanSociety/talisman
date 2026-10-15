import { BittensorStakingPositionPage } from "@ui/domains/Earn/bittensor/BittensorStakingPositionPage"
import { parseBittensorPositionRoute } from "@ui/domains/Earn/bittensor/bittensorPositionRoute"
import { Navigate, useParams } from "react-router-dom"

export const DashboardBittensorStakingPositionPage = () => {
  const { tokenId, address } = useParams()

  const params = parseBittensorPositionRoute(tokenId, address)
  if (!params) return <Navigate to="/earn" replace />

  return <BittensorStakingPositionPage tokenId={params.tokenId} address={params.address} />
}
