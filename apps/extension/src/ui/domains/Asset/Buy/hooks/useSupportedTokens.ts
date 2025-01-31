import { useMemo } from "react"

import { DEBUG } from "@extension/shared"
import { useChainsMap, useEvmNetworksMap, useRemoteConfig, useTokensMap } from "@ui/state"

import { RampAsset, RampAssetWithTokenAndChain } from "../types"

export function useSupportedTokens({ rampAssets }: { rampAssets: RampAsset[] }) {
  const tokensMap = useTokensMap({ activeOnly: false, includeTestnets: false })
  const chainsMap = useChainsMap({ activeOnly: false, includeTestnets: false })
  const evmNetworksMap = useEvmNetworksMap({ activeOnly: false, includeTestnets: false })
  const { rampSupportedTokenIds } = useRemoteConfig()

  const { ethereumTokens, substrateTokens } = useMemo(
    () =>
      rampAssets.reduce<{
        ethereumTokens: RampAssetWithTokenAndChain[]
        substrateTokens: RampAssetWithTokenAndChain[]
      }>(
        (acc, asset) => {
          const key = `${asset.chain}_${asset.symbol}`
          if (key in rampSupportedTokenIds) {
            const supportedTokenId = rampSupportedTokenIds[key]
            const token = tokensMap[supportedTokenId]
            if (!token) {
              if (DEBUG)
                // eslint-disable-next-line no-console
                console.error(`Token not found for tokenId ${supportedTokenId}`)
              return acc
            }

            const chain = token?.evmNetwork
              ? evmNetworksMap[token.evmNetwork.id]
              : chainsMap[token.chain?.id ?? 0]

            if (!chain) {
              if (DEBUG)
                // eslint-disable-next-line no-console
                console.error(
                  `Chain not found for chainId ${token?.chain?.id} and tokenId ${supportedTokenId}}`,
                )
              return acc
            }
            if (token?.evmNetwork) {
              acc.ethereumTokens.push({
                ...asset,
                tokenData: {
                  id: supportedTokenId,
                  token,
                  chain,
                },
              })
            } else {
              acc.substrateTokens.push({
                ...asset,
                tokenData: {
                  id: supportedTokenId,
                  token,
                  chain,
                },
              })
            }
          }
          return acc
        },
        { ethereumTokens: [], substrateTokens: [] },
      ),
    [chainsMap, evmNetworksMap, rampAssets, rampSupportedTokenIds, tokensMap],
  )

  return {
    ethereumTokens,
    substrateTokens,
    allSupportedTokens: [...ethereumTokens, ...substrateTokens],
  }
}
