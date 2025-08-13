import { useEffect } from "react"
import { useParams } from "react-router-dom"

import { DashboardDefiPosition } from "@ui/domains/Portfolio/DeFi/DashboardDefiPosition"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioDefiPosition = () => {
  const { pageOpenEvent } = useAnalytics()
  const { positionId } = useParams()

  useEffect(() => {
    pageOpenEvent("portfolio DeFi position")
  }, [pageOpenEvent])

  return <DashboardDefiPosition positionId={positionId} />
}
