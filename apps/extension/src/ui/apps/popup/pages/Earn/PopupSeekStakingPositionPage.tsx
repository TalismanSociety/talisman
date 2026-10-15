import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SeekStakingPositionPage } from "@ui/domains/Earn/seek/SeekStakingPositionPage"
import { Navigate, useParams } from "react-router-dom"

export const PopupSeekStakingPositionPage = () => {
  const { address } = useParams()

  if (!address) return <Navigate to="/earn" replace />

  return (
    <ScrollContainer className="p-8">
      <SeekStakingPositionPage address={address} />
    </ScrollContainer>
  )
}
