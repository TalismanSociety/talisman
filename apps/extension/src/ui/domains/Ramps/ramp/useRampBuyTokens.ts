import { Token } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { log } from "extension-shared"
import { groupBy } from "lodash-es"
import { useMemo } from "react"

import { useRemoteConfig, useTokensMap } from "@ui/state"

import { getTokenFromRampAsset } from "../shared/helpers"
import { useRampTokens } from "./useRampTokens"

export const useRampBuyTokens = (currency: string | undefined) => {
  const remoteConfig = useRemoteConfig()
  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const { data, isLoading, error } = useRampTokens(currency, "buy")

  const tokens = useMemo<Token[] | undefined>(() => {
    const unfound: unknown[] = []

    const assets = data?.assets
      .map((asset) => {
        const token = getTokenFromRampAsset(asset, remoteConfig, talismanTokens)
        if (!token) unfound.push(asset)
        return token
      })
      .filter(isNotNil)

    // @dev: have a look at this once in a while and add missing entries in remoteConfig
    if (unfound.length) log.warn("[ramps] Unfound RAMP tokens", groupBy(unfound, "chain"))

    return assets
  }, [data?.assets, remoteConfig, talismanTokens])

  return { tokens, isLoading, error }
}
