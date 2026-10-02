import type { Token } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { useSettingValue } from "@ui/state/settings"
import { useMemo } from "react"

import { getTokenRiskRef, tokenRiskScanQueryOptions, UNKNOWN_TOKEN_RISK } from "./tokenRiskScan"

export const useIsTokenRiskScanEnabled = () => {
  const withTokenScan = useFeatureFlag("BLOCKAID_TOKEN_SCAN")
  const autoTokenScan = useSettingValue("autoTokenScan")
  return withTokenScan && autoTokenScan !== false
}

export const useTokenRiskScan = (token: Token | null | undefined) => {
  const isEnabled = useIsTokenRiskScanEnabled()
  const ref = useMemo(() => (isEnabled ? getTokenRiskRef(token) : null), [isEnabled, token])
  const { data, isPending } = useQuery(tokenRiskScanQueryOptions(ref))

  const scan = ref ? data : UNKNOWN_TOKEN_RISK

  return { ref, scan, isPending: !!ref && isPending }
}
