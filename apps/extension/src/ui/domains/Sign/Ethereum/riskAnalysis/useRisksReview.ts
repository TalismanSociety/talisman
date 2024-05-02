import { ActionEnum } from "@blowfishxyz/api-client/v20230605"
import { useMemo, useState } from "react"
import { useOpenClose } from "talisman-ui"

export const useRisksReview = (action?: ActionEnum) => {
  const [isRiskAknowledged, setIsRiskAknowledged] = useState(false)

  const drawer = useOpenClose(false)

  const isRiskAknowledgementRequired = useMemo(() => action === ActionEnum.Block, [action])

  return {
    isRiskAknowledgementRequired,
    isRiskAknowledged,
    setIsRiskAknowledged,
    drawer,
  }
}
