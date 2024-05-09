import { ActionEnum } from "@blowfishxyz/api-client/v20230605"
import { useEffect, useMemo, useRef, useState } from "react"
import { useOpenClose } from "talisman-ui"

export const useRisksReview = (action?: ActionEnum) => {
  const [isRiskAknowledged, setIsRiskAknowledged] = useState(false)

  const drawer = useOpenClose(false)

  const isRiskAknowledgementRequired = useMemo(
    () => action === ActionEnum.Block || action === ActionEnum.Warn,
    [action]
  )

  // open review drawer automatically if risk is required
  const refIsInitialized = useRef(false)
  useEffect(() => {
    if (!refIsInitialized.current && isRiskAknowledgementRequired) {
      refIsInitialized.current = true
      drawer.open()
    }
  }, [drawer, isRiskAknowledgementRequired])

  return {
    isRiskAknowledgementRequired,
    isRiskAknowledged,
    setIsRiskAknowledged,
    drawer,
  }
}
