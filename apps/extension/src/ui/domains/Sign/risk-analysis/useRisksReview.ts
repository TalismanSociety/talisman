import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RiskAnalysisPlatform, RiskAnalysisResponse } from "./types"

const getValidationResultType = (
  platform: RiskAnalysisPlatform,
  response: RiskAnalysisResponse<RiskAnalysisPlatform> | null | undefined
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

/**
 * In-wallet flows analyse more than one transaction from the same hook instance: a swap follows its
 * ERC20 approval, a yield.xyz action can have several steps. Acknowledgement is therefore tied to
 * `subjectKey`, the identity of the analysed payload, so that acknowledging one flagged transaction
 * never clears the way for the next one.
 */
export const useRisksReview = (
  platform: RiskAnalysisPlatform,
  response: RiskAnalysisResponse | null | undefined,
  subjectKey: string
) => {
  const [acknowledgedKey, setAcknowledgedKey] = useState<string | null>(null)

  const isRiskAcknowledged = acknowledgedKey === subjectKey

  const setIsRiskAcknowledged = useCallback(
    (isAcknowledged: boolean) => setAcknowledgedKey(isAcknowledged ? subjectKey : null),
    [subjectKey]
  )

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

  // open review drawer automatically if risk is required, once per analysed transaction
  const refAutoOpenedKey = useRef<string | null>(null)
  useEffect(() => {
    if (refAutoOpenedKey.current !== subjectKey && isRiskAcknowledgementRequired) {
      refAutoOpenedKey.current = subjectKey
      drawer.open()
    }
  }, [drawer, isRiskAcknowledgementRequired, subjectKey])

  return {
    isRiskAcknowledgementRequired,
    isRiskAcknowledged,
    setIsRiskAcknowledged,
    drawer,
  }
}
