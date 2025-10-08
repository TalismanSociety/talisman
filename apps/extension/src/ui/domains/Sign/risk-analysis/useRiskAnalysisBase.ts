import {
  evmErc20TokenId,
  evmNativeTokenId,
  NetworkId,
  solNativeTokenId,
  solSplTokenId,
  TokenId,
} from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { QueryFunction, QueryKey, useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSetting, useTokensMap } from "@ui/state"

import { getRiskAnalysisScanError } from "./getRiskAnalysisScanError"
import {
  RiskAnalysisPlatform,
  RiskAnalysisResponse,
  RiskAnalysisScanError,
  RisksReview,
} from "./types"
import { useRisksReview } from "./useRisksReview"

type UseRiskAnalysisBaseProps<
  Platform extends RiskAnalysisPlatform,
  Key extends QueryKey,
  Func = QueryFunction<RiskAnalysisResponse<Platform> | null, Key>,
> = {
  platform: RiskAnalysisPlatform
  networkId: NetworkId | null | undefined
  disableAutoRiskScan?: boolean
  disableCriticalPane?: boolean
  queryKey: Key
  queryFn: Func
  enabled: boolean
}

export type RiskAnalysisResult<Platform extends RiskAnalysisPlatform> = {
  platform: Platform
  networkId: NetworkId | undefined
  shouldPromptAutoRiskScan: boolean
  isAvailable: boolean
  unavailableReason: string | undefined
  isValidating: boolean
  result: RiskAnalysisResponse<Platform> | null | undefined
  error: unknown
  scanError: RiskAnalysisScanError | null
  review: RisksReview
  launchScan: () => void
  validationResult: "Benign" | "Warning" | "Malicious" | "Error" | undefined
  disableCriticalPane: boolean
  tokenIds: TokenId[]
}

export const useRiskAnalysisBase = <
  Platform extends RiskAnalysisPlatform,
  Key extends QueryKey = unknown[],
  Result = RiskAnalysisResult<Platform>,
>({
  platform,
  networkId,
  disableAutoRiskScan,
  disableCriticalPane = false,
  queryKey,
  queryFn,
  enabled,
}: UseRiskAnalysisBaseProps<Platform, Key>): Result => {
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

  const review = useRisksReview(platform, result)

  const scanError = useMemo(
    () => (result ? getRiskAnalysisScanError(platform, result, t) : null),
    [platform, result, t],
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

  const validationResult = useMemo(() => {
    if (platform === "solana") {
      const r = result as RiskAnalysisResponse<"solana"> | undefined
      return r?.result?.validation?.result_type
    }

    if (platform === "ethereum") {
      const r = result as RiskAnalysisResponse<"ethereum"> | undefined
      return r?.validation?.result_type
    }

    return undefined
  }, [platform, result])

  const tokensMap = useTokensMap()

  const tokenIds = useMemo<TokenId[]>(() => {
    if (platform === "ethereum" && networkId) {
      const r = result as RiskAnalysisResponse<"ethereum"> | undefined
      if (r?.simulation?.status === "Success")
        return r.simulation.account_summary.assets_diffs
          .map((diff) => {
            if (diff.asset.type === "NATIVE") return evmNativeTokenId(networkId)
            if (diff.asset.type === "ERC20")
              return evmErc20TokenId(networkId, diff.asset.address as `0x${string}`)
            return null
          })
          .filter(isNotNil)
          .filter((id) => tokensMap[id]) // only keep tokens we know about
    }
    if (platform === "solana" && networkId) {
      const r = result as RiskAnalysisResponse<"solana"> | undefined
      if (r?.result?.simulation?.account_summary.account_assets_diff) {
        return r.result.simulation.account_summary.account_assets_diff
          .map((token) => {
            if (token.asset.type === "SOL") return solNativeTokenId(networkId)
            if (token.asset.type === "TOKEN") return solSplTokenId(networkId, token.asset.address)
            return null
          })
          .filter(isNotNil)
          .filter((id) => tokensMap[id]) // only keep tokens we know about
      }
    }
    return []
  }, [networkId, platform, result, tokensMap])

  return {
    platform,
    networkId,
    isAvailable,
    unavailableReason,
    isValidating,
    result: result as RiskAnalysisResponse<Platform> | null | undefined,
    error,
    scanError,
    launchScan,
    review,
    shouldPromptAutoRiskScan,
    validationResult,
    disableCriticalPane,
    tokenIds,
  } as Result
}
