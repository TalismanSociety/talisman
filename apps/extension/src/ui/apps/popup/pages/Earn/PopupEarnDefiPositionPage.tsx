import { ScrollContainer } from "@ui/components/ScrollContainer"
import { EarnDefiPosition } from "@ui/domains/Earn/defi/components/EarnDefiPosition"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"

export const PopupEarnDefiPositionPage = () => {
  const { pageOpenEvent } = useAnalytics()
  const { positionId } = useParams()

  useEffect(() => {
    pageOpenEvent("earn defi position")
  }, [pageOpenEvent])

  if (!positionId) return <Navigate to="/earn/positions" replace />

  return (
    <ScrollContainer className="p-8">
      <EarnDefiPosition positionId={positionId} />
    </ScrollContainer>
  )
}
