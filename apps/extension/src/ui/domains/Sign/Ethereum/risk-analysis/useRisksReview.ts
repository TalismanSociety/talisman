import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useState } from "react"

export const useRisksReview = (isRiskAknowledgementRequired: boolean) => {
  const [isRiskAknowledged, setIsRiskAknowledged] = useState(false)

  const risksDrawer = useOpenClose(false)

  return {
    isRiskAknowledgementRequired,
    isRiskAknowledged,
    setIsRiskAknowledged,
    drawer: risksDrawer,
  }
}

export type RisksReview = ReturnType<typeof useRisksReview>
