import { TransactionScanResponse } from "@blockaid/client/resources/index.mjs"
import { NetworkId } from "@talismn/chaindata-provider"
import { QueryFunction, QueryKey, useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSetting } from "@ui/state"

import { getRiskAnalysisScanError } from "../Ethereum/riskAnalysis/getRiskAnalysisScanError"
import { RiskAnalysisScanError, RisksReview } from "../Ethereum/riskAnalysis/types"
import { useRisksReview } from "../Ethereum/riskAnalysis/useRisksReview"

type UseRiskAnalysisBaseProps<
  Key extends QueryKey,
  Func = QueryFunction<TransactionScanResponse | null, Key>,
> = {
  networkId: NetworkId | undefined
  disableAutoRiskScan?: boolean
  queryKey: Key
  queryFn: Func
  enabled: boolean
}

type RiskAnalysisResult = {
  networkId: NetworkId | undefined
  shouldPromptAutoRiskScan: boolean
  isAvailable: boolean
  unavailableReason: string | undefined
  isValidating: boolean
  result: TransactionScanResponse | null | undefined
  error: unknown
  scanError: RiskAnalysisScanError | null
  review: RisksReview
  launchScan: () => void
}

export const useRiskAnalysisBase = <Key extends QueryKey>({
  networkId,
  disableAutoRiskScan,
  queryKey,
  queryFn,
  enabled,
}: UseRiskAnalysisBaseProps<Key>): RiskAnalysisResult => {
  const { t } = useTranslation()
  const [autoRiskScan] = useSetting("autoRiskScan")
  const [isScanRequested, setIsScanRequested] = useState(false)

  const effectiveAutoRiskScan = useMemo(
    () => !disableAutoRiskScan && !!autoRiskScan,
    [autoRiskScan, disableAutoRiskScan],
  )

  const [isAvailable, unavailableReason] = useMemo(() => {
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

  // useEffect(() => {
  //   log.debug("RiskAnalysisBase", { result, error })
  // }, [result, error])

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
    networkId,
    isAvailable,
    unavailableReason,
    isValidating,
    result,
    error,
    scanError,
    launchScan,
    review,
    shouldPromptAutoRiskScan,
  }
}
