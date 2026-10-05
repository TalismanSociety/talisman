import { ScrollContainer } from "@ui/components/ScrollContainer"
import { EarnDefiPosition } from "@ui/domains/Earn/defi/components/EarnDefiPosition"
import { Navigate, useParams } from "react-router-dom"

export const PopupEarnDefiPositionPage = () => {
  const { positionId } = useParams()

  if (!positionId) return <Navigate to="/earn/positions" replace />

  return (
    <ScrollContainer className="p-8">
      <EarnDefiPosition positionId={positionId} />
    </ScrollContainer>
  )
}
