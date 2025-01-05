import { useMemo } from "react"

import { DEBUG } from "@extension/shared"
import { useChainsMap, useEvmNetworksMap, useTokensMap } from "@ui/state"

import { RampAsset, RampAssetWithTokenAndChain, SupportedTokenInfo } from "../types"

// Key naming convention: CHAINAME_TOKENSYMBOL
const supportedRampTokenInfo: Record<string, SupportedTokenInfo> = {
  POLKADOT_DOT: {
    id: "polkadot-substrate-native",
  },
  DOT_DOT: {
    id: "polkadot-asset-hub-substrate-native",
  },
  KUSAMA_KSM: {
    id: "kusama-substrate-native",
  },
  DOT_USDC: {
    id: "polkadot-asset-hub-substrate-assets-1337-usdc",
  },
  DOT_USDT: {
    id: "polkadot-asset-hub-substrate-assets-1984-usdt",
  },
  MATIC_POL: {
    id: "137-evm-native",
  },
}

export default function useSupportedTokens({ rampAssets }: { rampAssets: RampAsset[] }) {
  const tokensMap = useTokensMap({ activeOnly: false, includeTestnets: false })
  const chainsMap = useChainsMap({ activeOnly: false, includeTestnets: false })
  const evmNetworksMap = useEvmNetworksMap({ activeOnly: false, includeTestnets: false })

  const supportedRampTokens = useMemo(
    () =>
      rampAssets.reduce<RampAssetWithTokenAndChain[]>((acc, asset) => {
        const key = `${asset.chain}_${asset.symbol}`
        if (key in supportedRampTokenInfo) {
          const supportedToken = supportedRampTokenInfo[key]
          const token = tokensMap[supportedToken.id]
          const chain = token.evmNetwork
            ? evmNetworksMap[token.evmNetwork.id]
            : chainsMap[token.chain?.id ?? 0]

          // eslint-disable-next-line no-console
          if (!token && DEBUG) console.error(`Token not found for tokenId ${supportedToken.id}`)
          if (!chain && DEBUG)
            // eslint-disable-next-line no-console
            console.error(
              `Chain not found for chainId ${token.chain?.id} and tokenId ${supportedToken.id}}`,
            )
          acc.push({
            ...asset,
            tokenData: {
              ...supportedRampTokenInfo[key],
              token,
              chain,
            },
          })
        }
        return acc
      }, []),
    [chainsMap, evmNetworksMap, rampAssets, tokensMap],
  )

  return supportedRampTokens
}
