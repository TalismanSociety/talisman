import { ActionEnum } from "@blowfishxyz/api-client/v20230605"
import { useEffect, useMemo, useRef, useState } from "react"
import { useOpenClose } from "talisman-ui"

export const useRisksReview = (action?: ActionEnum) => {
  const [isRiskAcknowledged, setIsRiskAcknowledged] = useState(false)

  const drawer = useOpenClose(false)

  const isRiskAcknowledgementRequired = useMemo(
    () => action === ActionEnum.Block || action === ActionEnum.Warn,
    [action],
  )

  // open review drawer automatically if risk is required
  const refIsInitialized = useRef(false)
  useEffect(() => {
    if (!refIsInitialized.current && isRiskAcknowledgementRequired) {
      refIsInitialized.current = true
      drawer.open()
    }
  }, [drawer, isRiskAcknowledgementRequired])

  return {
    isRiskAcknowledgementRequired,
    isRiskAcknowledged,
    setIsRiskAcknowledged,
    drawer,
  }
}
