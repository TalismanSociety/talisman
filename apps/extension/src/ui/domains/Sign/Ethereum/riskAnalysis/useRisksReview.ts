import { TransactionScanResponse } from "@blockaid/client/resources/index.mjs"
import { useEffect, useMemo, useRef, useState } from "react"
import { useOpenClose } from "talisman-ui"

export const useRisksReview = (response: TransactionScanResponse | null | undefined) => {
  const [isRiskAcknowledged, setIsRiskAcknowledged] = useState(false)

  const drawer = useOpenClose(false)

  const isRiskAcknowledgementRequired = useMemo(() => {
    switch (response?.validation?.result_type) {
      case "Warning":
      case "Malicious":
        return true
      default:
        return false
    }
  }, [response?.validation?.result_type])

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
