import { ScrollContainer } from "@ui/components/ScrollContainer"
import { BittensorStakingPositionPage } from "@ui/domains/Earn/bittensor/BittensorStakingPositionPage"
import { parseBittensorPositionRoute } from "@ui/domains/Earn/bittensor/bittensorPositionRoute"
import { Navigate, useParams } from "react-router-dom"

export const PopupBittensorStakingPositionPage = () => {
  const { tokenId, address } = useParams()

  const params = parseBittensorPositionRoute(tokenId, address)
  if (!params) return <Navigate to="/earn" replace />

  return (
    <ScrollContainer className="p-8">
      <BittensorStakingPositionPage tokenId={params.tokenId} address={params.address} />
    </ScrollContainer>
  )
}
