import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"

import { YieldxyzYieldPositions } from "@ui/domains/Earn/yieldxyz/positions/YieldxyzYieldPositions"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const DashboardYieldxyzYieldPositionsPage = () => {
  const { pageOpenEvent } = useAnalytics()
  const { yieldId, address } = useParams()

  useEffect(() => {
    pageOpenEvent("earn yieldxyz position", { yieldId })
  }, [pageOpenEvent, yieldId])

  if (!yieldId || !address) return <Navigate to="/earn" replace />

  return <YieldxyzYieldPositions yieldId={yieldId} address={address} />
}
