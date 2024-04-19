import { useSetting } from "@ui/hooks/useSettings"
import { EvmNetworkId, getBlowfishChainInfo } from "extension-core"
import { useMemo, useState } from "react"

export const useEvmRiskAnalysisBase = (
  evmNetworkId: EvmNetworkId | undefined,
  url: string | undefined
) => {
  const [autoRiskScan] = useSetting("autoRiskScan")
  const [isValidationRequested, setIsValidationRequested] = useState(false)

  // if undefined, user has never used the feature
  const shouldPromptAutoRiskScan = useMemo(() => autoRiskScan === undefined, [autoRiskScan])

  const shouldValidate = useMemo(
    () => autoRiskScan || isValidationRequested,
    [autoRiskScan, isValidationRequested]
  )

  const origin = useMemo(() => {
    if (url) {
      try {
        return new URL(url).origin
      } catch (err) {
        // ignore
      }
    }
    return window.location.origin // fallback to extension's origin
  }, [url])

  const chainInfo = useMemo(() => {
    return evmNetworkId ? getBlowfishChainInfo(evmNetworkId) : null
  }, [evmNetworkId])

  return {
    shouldPromptAutoRiskScan,
    shouldValidate,
    origin,
    chainInfo,
    isValidationRequested,
    setIsValidationRequested,
  }
}
