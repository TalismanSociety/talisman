import { useEffect } from "react"

import { DashboardDefiPositions } from "@ui/domains/Portfolio/DeFi/DashboardDefiPositions"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioDefiPositions = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio DeFi")
  }, [pageOpenEvent])

  return <DashboardDefiPositions />
}
