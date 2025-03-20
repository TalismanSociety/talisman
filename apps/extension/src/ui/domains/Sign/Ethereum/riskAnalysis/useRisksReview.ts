import { useEffect, useMemo, useRef, useState } from "react"
import { useOpenClose } from "talisman-ui"

import { TenderlyActionType } from "./types"

export const useRisksReview = (action?: TenderlyActionType) => {
  const [isRiskAcknowledged, setIsRiskAcknowledged] = useState(false)

  const drawer = useOpenClose(false)

  const isRiskAcknowledgementRequired = useMemo(
    () => action === "Dangerous" || action === "Warning",
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
