import { ScrollContainer } from "@ui/components/ScrollContainer"
import { YieldxyzYieldPositions } from "@ui/domains/Earn/yieldxyz/positions/YieldxyzYieldPositions"
import { Navigate, useParams } from "react-router-dom"

export const PopupYieldxyzYieldPositionsPage = () => {
  const { yieldId, address } = useParams()

  if (!yieldId || !address) return <Navigate to="/earn" replace />

  return (
    <ScrollContainer className="p-8">
      <YieldxyzYieldPositions yieldId={yieldId} address={address} />
    </ScrollContainer>
  )
}
