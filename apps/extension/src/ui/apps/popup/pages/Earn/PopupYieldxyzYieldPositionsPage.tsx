import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"

import { YieldxyzYieldPositions } from "@ui/domains/Earn/yieldxyz/positions/YieldxyzYieldPositions"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PopupYieldxyzYieldPositionsPage = () => {
  const { pageOpenEvent } = useAnalytics()
  const { yieldId, address } = useParams()
  // const [searchParams] = useSearchParams()

  useEffect(() => {
    pageOpenEvent("earn yieldxyz position", { yieldId })
  }, [pageOpenEvent, yieldId])

  if (!yieldId || !address) return <Navigate to="/earn" replace />

  return <YieldxyzYieldPositions yieldId={yieldId} address={address} />
}
