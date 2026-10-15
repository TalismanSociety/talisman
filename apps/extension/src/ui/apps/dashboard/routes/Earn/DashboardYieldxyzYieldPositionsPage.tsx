import { YieldxyzYieldPositions } from "@ui/domains/Earn/yieldxyz/positions/YieldxyzYieldPositions"
import { Navigate, useParams } from "react-router-dom"

export const DashboardYieldxyzYieldPositionsPage = () => {
  const { yieldId, address } = useParams()

  if (!yieldId || !address) return <Navigate to="/earn" replace />

  return <YieldxyzYieldPositions yieldId={yieldId} address={address} />
}
