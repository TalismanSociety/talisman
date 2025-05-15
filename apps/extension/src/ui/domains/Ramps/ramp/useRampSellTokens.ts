import { Token } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useRemoteConfig, useTokensMap } from "@ui/state"

import { getTokenFromRampAsset } from "../shared/helpers"
import { useRampTokens } from "./useRampTokens"

export const useRampSellTokens = (currency: string | undefined) => {
  const remoteConfig = useRemoteConfig()
  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const { data, isLoading, error } = useRampTokens(currency, "sell")

  const tokens = useMemo<Token[] | undefined>(() => {
    return data?.assets
      .map((asset) => getTokenFromRampAsset(asset, remoteConfig, talismanTokens))
      .filter(isNotNil)
  }, [data?.assets, remoteConfig, talismanTokens])

  return { tokens, isLoading, error }
}
