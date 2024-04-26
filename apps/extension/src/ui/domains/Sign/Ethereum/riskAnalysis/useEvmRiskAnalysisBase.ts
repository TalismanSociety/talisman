import { QueryFunction, QueryKey, useQuery } from "@tanstack/react-query"
import { useSetting } from "@ui/hooks/useSettings"
import { BlowfishEvmChainInfo, EvmNetworkId, getBlowfishChainInfo } from "extension-core"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { getRiskAnalysisScanError } from "./getRiskAnalysisScanError"
import { PayloadType, ResponseType, RiskAnalysisScanError, RisksReview } from "./types"
import { useRisksReview } from "./useRisksReview"

type UseEvmRiskAnalysisBaseProps<
  Type extends PayloadType,
  Key extends QueryKey,
  Func = QueryFunction<ResponseType<Type>, Key>
> = {
  type: Type
  evmNetworkId: EvmNetworkId | undefined
  disableAutoRiskScan?: boolean
  queryKey: Key
  queryFn: Func
  enabled: boolean
}

type EvmRiskAnalysisResult<Type extends PayloadType, Result = ResponseType<Type>> = {
  type: Type
  shouldPromptAutoRiskScan: boolean
  isAvailable: boolean
  isValidating: boolean
  result: Result | undefined
  error: unknown
  scanError: RiskAnalysisScanError | null
  chainInfo: BlowfishEvmChainInfo | null
  review: RisksReview
  launchScan: () => void
}

export const useEvmRiskAnalysisBase = <Type extends PayloadType, Key extends QueryKey>({
  type,
  evmNetworkId,
  disableAutoRiskScan,
  queryKey,
  queryFn,
  enabled,
}: UseEvmRiskAnalysisBaseProps<Type, Key>): EvmRiskAnalysisResult<Type> => {
  const [autoRiskScan] = useSetting("autoRiskScan")
  const [isScanRequested, setIsScanRequested] = useState(false)

  const effectiveAutoRiskScan = useMemo(
    () => !disableAutoRiskScan && !!autoRiskScan,
    [autoRiskScan, disableAutoRiskScan]
  )

  const [chainInfo, isAvailable] = useMemo(() => {
    const ci = evmNetworkId ? getBlowfishChainInfo(evmNetworkId) : null
    return [ci, !!ci]
  }, [evmNetworkId])

  // if undefined, user has never used the feature
  const shouldPromptAutoRiskScan = useMemo(
    () => isAvailable && !disableAutoRiskScan && autoRiskScan === undefined,
    [autoRiskScan, disableAutoRiskScan, isAvailable]
  )

  const shouldValidate = useMemo(
    () => isAvailable && (effectiveAutoRiskScan || isScanRequested),
    [effectiveAutoRiskScan, isAvailable, isScanRequested]
  )

  const {
    isLoading,
    data: result,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    enabled: enabled && shouldValidate,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    retry: false,
  })

  const review = useRisksReview(result?.action)

  const { t } = useTranslation()
  const scanError = useMemo(
    () => (result ? getRiskAnalysisScanError(type, result, t) : null),
    [type, result, t]
  )

  const launchScan = useCallback(() => {
    if (isAvailable) {
      if (result) review.drawer.open()
      else if (error) refetch() // manual retry
      else setIsScanRequested(true) // first manual attempt, enables useQuery hook
    }
  }, [error, isAvailable, refetch, result, review.drawer, setIsScanRequested])

  const refAutoOpen = useRef(false)
  useEffect(() => {
    if (refAutoOpen.current || !isScanRequested) return
    if (result) {
      refAutoOpen.current = true
      review.drawer.open()
    }
  }, [error, isScanRequested, result, review.drawer])

  return {
    type,
    isAvailable,
    isValidating: isAvailable && shouldValidate && isLoading,
    result,
    error,
    scanError,
    launchScan,
    chainInfo,
    review,
    shouldPromptAutoRiskScan,
  }
}
