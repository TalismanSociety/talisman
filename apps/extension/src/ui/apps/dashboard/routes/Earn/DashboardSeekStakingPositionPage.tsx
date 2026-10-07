import { SeekStakingPositionPage } from "@ui/domains/Earn/seek/SeekStakingPositionPage"
import { Navigate, useParams } from "react-router-dom"

export const DashboardSeekStakingPositionPage = () => {
  const { address } = useParams()

  if (!address) return <Navigate to="/earn" replace />

  return <SeekStakingPositionPage address={address} />
}
