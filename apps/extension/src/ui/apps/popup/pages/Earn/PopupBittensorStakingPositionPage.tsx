import { ScrollContainer } from "@ui/components/ScrollContainer"
import { BittensorStakingPositionPage } from "@ui/domains/Earn/bittensor/BittensorStakingPositionPage"
import { parseBittensorPositionRoute } from "@ui/domains/Earn/bittensor/bittensorPositionRoute"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"

export const PopupBittensorStakingPositionPage = () => {
  const { pageOpenEvent } = useAnalytics()
  const { tokenId, address } = useParams()

  useEffect(() => {
    pageOpenEvent("earn bittensor position")
  }, [pageOpenEvent])

  const params = parseBittensorPositionRoute(tokenId, address)
  if (!params) return <Navigate to="/earn" replace />

  return (
    <ScrollContainer className="p-8">
      <BittensorStakingPositionPage tokenId={params.tokenId} address={params.address} />
    </ScrollContainer>
  )
}
