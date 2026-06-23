import { SeekStakingPositionPage } from "@ui/domains/Earn/seek/SeekStakingPositionPage"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"

export const DashboardSeekStakingPositionPage = () => {
  const { pageOpenEvent } = useAnalytics()
  const { address } = useParams()

  useEffect(() => {
    pageOpenEvent("earn seek position")
  }, [pageOpenEvent])

  if (!address) return <Navigate to="/earn" replace />

  return <SeekStakingPositionPage address={address} />
}
