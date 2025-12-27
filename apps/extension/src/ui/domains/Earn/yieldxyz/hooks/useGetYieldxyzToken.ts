import {
  evmErc20TokenId,
  evmNativeTokenId,
  solNativeTokenId,
  solSplTokenId,
  subNativeTokenId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { getYieldxyzNetworkIdToTalismanNetworkIdMap, TokenDto } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useMemo } from "react"

import { useNetworksMapById, useRemoteConfig, useTokensMap } from "@ui/state"

export const useGetYieldxyzToken = () => {
  const remoteConfig = useRemoteConfig()
  const networksMap = useNetworksMapById()
  const tokensMap = useTokensMap()

  const mapToTalismanNetworkId = useMemo(
    () => getYieldxyzNetworkIdToTalismanNetworkIdMap(remoteConfig),
    [remoteConfig],
  )

  const getYieldxyzTokenId = useCallback(
    (token: TokenDto): TokenId | null => {
      const networkId = mapToTalismanNetworkId[token.network]
      if (!networkId) return null

      const network = networksMap[networkId]
      if (!network) return null

      switch (network.platform) {
        case "ethereum":
          return token.address
            ? evmErc20TokenId(networkId, token.address as `0x${string}`)
            : evmNativeTokenId(networkId)
        case "polkadot": {
          if (token.symbol === network.nativeCurrency.symbol) return subNativeTokenId(networkId)
          log.warn("Unsupported polkadot token for yieldxyz:", token)
          return null
        }
        case "solana": {
          if (token.address) return solSplTokenId(networkId, token.address)
          if (token.symbol === network.nativeCurrency.symbol) return solNativeTokenId(networkId)
          log.warn("Unsupported solana token for yieldxyz:", token)
          return null
        }
      }
    },
    [mapToTalismanNetworkId, networksMap],
  )

  const getYieldxyzToken = useCallback(
    (token: TokenDto): Token | null => {
      const tokenId = getYieldxyzTokenId(token)
      if (!tokenId) return null
      return tokensMap[tokenId] ?? null
    },
    [getYieldxyzTokenId, tokensMap],
  )

  return { getYieldxyzTokenId, getYieldxyzToken }
}
