import { useSetting } from "@ui/hooks/useSettings"
import { EvmNetworkId, getBlowfishChainInfo } from "extension-core"
import { useMemo, useState } from "react"

export const useEvmRiskAnalysisBase = (
  evmNetworkId: EvmNetworkId | undefined,
  url: string | undefined,
  disableAutoRiskScan?: boolean
) => {
  const [autoRiskScan] = useSetting("autoRiskScan")
  const effectiveAutoRiskScan = useMemo(
    () => !disableAutoRiskScan && !!autoRiskScan,
    [autoRiskScan, disableAutoRiskScan]
  )
  const [isValidationRequested, setIsValidationRequested] = useState(false)

  // if undefined, user has never used the feature
  const shouldPromptAutoRiskScan = useMemo(
    () => !disableAutoRiskScan && autoRiskScan === undefined,
    [autoRiskScan, disableAutoRiskScan]
  )

  const shouldValidate = useMemo(
    () => effectiveAutoRiskScan || isValidationRequested,
    [effectiveAutoRiskScan, isValidationRequested]
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
    isAvailable: !!chainInfo,
    isValidationRequested,
    setIsValidationRequested,
  }
}
