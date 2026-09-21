import type { Token } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { useSettingValue } from "@ui/state/settings"
import { useEffect, useMemo } from "react"

import {
  getTokenRiskRef,
  type TokenRiskRef,
  type TokenRiskScan,
  tokenRiskScanQueryOptions,
  UNKNOWN_TOKEN_RISK,
} from "./tokenRiskScan"

type TokenRiskSurface = "swap-select" | "add-token" | "dapp-add-token" | "token-settings"

export const useIsTokenRiskScanEnabled = () => {
  const withTokenScan = useFeatureFlag("BLOCKAID_TOKEN_SCAN")
  const autoTokenScan = useSettingValue("autoTokenScan")
  return withTokenScan && autoTokenScan !== false
}

const useTokenRiskScanAnalytics = (
  surface: TokenRiskSurface,
  ref: TokenRiskRef | null,
  scan: TokenRiskScan | undefined
) => {
  const { genericEvent } = useAnalytics()
  const verdict = scan?.verdict
  useEffect(() => {
    if (ref && verdict) genericEvent("token risk scan", { surface, verdict, chainId: ref.chainId })
  }, [genericEvent, surface, ref, verdict])
}

export const useTokenRiskScan = (token: Token | null | undefined, surface?: TokenRiskSurface) => {
  const isEnabled = useIsTokenRiskScanEnabled()
  const ref = useMemo(() => (isEnabled ? getTokenRiskRef(token) : null), [isEnabled, token])
  const { data, isPending } = useQuery(tokenRiskScanQueryOptions(ref))

  const scan = ref ? data : UNKNOWN_TOKEN_RISK
  useTokenRiskScanAnalytics(surface ?? "token-settings", surface ? ref : null, scan)

  return { ref, scan, isPending: !!ref && isPending }
}
