import { useEffect, useMemo, useRef, useState } from "react"
import { useOpenClose } from "talisman-ui"

import { RiskAnalysisPlatform, RiskAnalysisResponse } from "./types"

const getValidationResultType = (
  platform: RiskAnalysisPlatform,
  response: RiskAnalysisResponse<RiskAnalysisPlatform> | null | undefined,
) => {
  switch (platform) {
    case "ethereum": {
      const r = response as RiskAnalysisResponse<"ethereum"> | undefined
      return r?.validation?.result_type
    }
    case "solana": {
      const r = response as RiskAnalysisResponse<"solana"> | undefined
      return r?.result?.validation?.result_type
    }
  }

  return undefined
}

export const useRisksReview = (
  platform: RiskAnalysisPlatform,
  response: RiskAnalysisResponse | null | undefined,
) => {
  const [isRiskAcknowledged, setIsRiskAcknowledged] = useState(false)

  const drawer = useOpenClose(false)

  const isRiskAcknowledgementRequired = useMemo(() => {
    const resultType = getValidationResultType(platform, response)
    switch (resultType) {
      case "Warning":
      case "Malicious":
        return true
      default:
        return false
    }
  }, [platform, response])

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
