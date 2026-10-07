import { EarnDefiPosition } from "@ui/domains/Earn/defi/components/EarnDefiPosition"
import { Navigate, useParams } from "react-router-dom"

export const DashboardEarnDefiPositionPage = () => {
  const { positionId } = useParams()

  if (!positionId) return <Navigate to="/earn/positions" replace />

  return <EarnDefiPosition positionId={positionId} />
}
