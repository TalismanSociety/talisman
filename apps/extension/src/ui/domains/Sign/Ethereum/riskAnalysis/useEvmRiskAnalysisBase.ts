import { TransactionScanResponse } from "@blockaid/client/resources/index.mjs"
import { NetworkId } from "@talismn/chaindata-provider"
import { QueryFunction, QueryKey, useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSetting } from "@ui/state"

// import { getBlowfishChainInfo } from "./blowfish"
import { getRiskAnalysisScanError } from "./getRiskAnalysisScanError"
import {
  // BlowfishEvmChainInfo,
  // PayloadType,
  // ResponseType,
  RiskAnalysisScanError,
  RisksReview,
} from "./types"
import { useRisksReview } from "./useRisksReview"

type UseEvmRiskAnalysisBaseProps<
  Key extends QueryKey,
  Func = QueryFunction<TransactionScanResponse | null, Key>,
> = {
  networkId: NetworkId | undefined
  disableAutoRiskScan?: boolean
  queryKey: Key
  queryFn: Func
  enabled: boolean
}

type EvmRiskAnalysisResult = {
  networkId: NetworkId | undefined
  shouldPromptAutoRiskScan: boolean
  isAvailable: boolean
  unavailableReason: string | undefined
  isValidating: boolean
  result: TransactionScanResponse | null | undefined
  error: unknown
  scanError: RiskAnalysisScanError | null
  // chainInfo: BlowfishEvmChainInfo | null
  review: RisksReview
  launchScan: () => void
}

export const useEvmRiskAnalysisBase = <Key extends QueryKey>({
  networkId,
  disableAutoRiskScan,
  queryKey,
  queryFn,
  enabled,
}: UseEvmRiskAnalysisBaseProps<Key>): EvmRiskAnalysisResult => {
  const { t } = useTranslation()
  const [autoRiskScan] = useSetting("autoRiskScan")
  const [isScanRequested, setIsScanRequested] = useState(false)

  const effectiveAutoRiskScan = useMemo(
    () => !disableAutoRiskScan && !!autoRiskScan,
    [autoRiskScan, disableAutoRiskScan],
  )

  // const chainInfo = useMemo(
  //   () => (networkId ? getBlowfishChainInfo(networkId) : null),
  //   [networkId],
  // )

  const [isAvailable, unavailableReason] = useMemo(() => {
    // if (!chainInfo) return [false, t("Risk analysis is not available on this network")]
    if (!enabled) return [false, t("Risk analysis unavailable")]
    return [true, undefined]
  }, [enabled, t])

  // if undefined, user has never used the feature
  const shouldPromptAutoRiskScan = useMemo(
    () => isAvailable && !disableAutoRiskScan && autoRiskScan === undefined,
    [autoRiskScan, disableAutoRiskScan, isAvailable],
  )

  const shouldValidate = useMemo(
    () => isAvailable && (effectiveAutoRiskScan || isScanRequested),
    [effectiveAutoRiskScan, isAvailable, isScanRequested],
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

  useEffect(() => {
    log.debug("EvmRiskAnalysisBase result", { result, error })
  }, [result, error])

  //result?.validation?.result_type

  const review = useRisksReview(result)

  const scanError = useMemo(
    () => (result ? getRiskAnalysisScanError(result, t) : null),
    [result, t],
  )

  const launchScan = useCallback(() => {
    if (isAvailable) {
      if (result) review.drawer.open()
      else if (error)
        refetch() // manual retry
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

  const isValidating = useMemo(
    () => isAvailable && shouldValidate && isLoading && enabled,
    [enabled, isAvailable, isLoading, shouldValidate],
  )

  return {
    //type,
    networkId,
    isAvailable,
    unavailableReason,
    isValidating,
    result,
    error,
    scanError,
    launchScan,
    //chainInfo,
    review,
    shouldPromptAutoRiskScan,
  }
}
