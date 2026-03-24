import { EarnDefiPosition } from "@ui/domains/Earn/defi/EarnDefiPosition"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"

export const DashboardEarnDefiPositionPage = () => {
  const { pageOpenEvent } = useAnalytics()
  const { positionId } = useParams()

  useEffect(() => {
    pageOpenEvent("earn defi position")
  }, [pageOpenEvent])

  if (!positionId) return <Navigate to="/earn/positions" replace />

  return <EarnDefiPosition positionId={positionId} />
}
