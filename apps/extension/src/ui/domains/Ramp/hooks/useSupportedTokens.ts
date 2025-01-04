import { useMemo } from "react"

import { useChains, useTokens } from "@ui/state"

import { RampAsset, RampAssetWithTokenAndChain } from "../types"

// Key naming convention: CHAINAME_TOKENSYMBOL
const supportedRampTokenInfo: { [key: string]: { id: string } } = {
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
}

export default function useSupportedTokens({ rampAssets }: { rampAssets: RampAsset[] }) {
  const allTokens = useTokens({ activeOnly: false, includeTestnets: false })
  const chains = useChains({ activeOnly: true, includeTestnets: false })

  const supportedRampTokens = useMemo(
    () =>
      rampAssets.reduce<RampAssetWithTokenAndChain[]>((acc, asset) => {
        const key = `${asset.chain}_${asset.symbol}`
        if (key in supportedRampTokenInfo) {
          const token = allTokens.find((t) => t.id === supportedRampTokenInfo[key].id)
          const chain = chains.find((c) => c.id === token?.chain?.id)
          acc.push({ ...asset, ...supportedRampTokenInfo[key], tokenChain: chain })
        }
        return acc
      }, []),
    [allTokens, chains, rampAssets],
  )

  return supportedRampTokens
}
