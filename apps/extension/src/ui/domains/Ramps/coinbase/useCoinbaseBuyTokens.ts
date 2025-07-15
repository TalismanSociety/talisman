import { Token } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { log } from "extension-shared"
import { groupBy } from "lodash-es"
import { useMemo } from "react"

import { useTokensMap } from "@ui/state"

import { getTokenFromCoinbaseAsset } from "../shared/helpers"
import { useCoinbaseBuyOptions } from "./useCoinbaseBuyOptions"

type UnfoundCoinbaseToken = {
  id: string
  name: string
  symbol: string
  networkName: string
  chainId: string
  contractAddress: string
  networkDisplayName: string
}

export const useCoinbaseBuyTokens = () => {
  const { data: coinbaseBuyOptions, isLoading, error } = useCoinbaseBuyOptions()

  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const tokens = useMemo<Token[] | undefined>(() => {
    const unfound: UnfoundCoinbaseToken[] = []

    const assets = coinbaseBuyOptions?.purchase_currencies
      .flatMap(({ networks, ...token }) => networks.map((n) => [token, n] as const))
      .map(([token, tokenNetwork]) => {
        const talismanToken = getTokenFromCoinbaseAsset(tokenNetwork, talismanTokens)

        if (!talismanToken)
          unfound.push({
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            networkName: tokenNetwork.name,
            chainId: tokenNetwork.chain_id,
            contractAddress: tokenNetwork.contract_address,
            networkDisplayName: tokenNetwork.display_name,
          })

        return talismanToken
      })
      .filter(isNotNil)

    // @dev: have a look at this once in a while and add missing entries in remoteConfig
    if (unfound.length) log.warn("[ramps] Unfound COINBASE tokens", groupBy(unfound, "networkName"))

    return assets
  }, [coinbaseBuyOptions?.purchase_currencies, talismanTokens])

  return { tokens, isLoading, error }
}
