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
  ETH_USDT: {
    id: "1-evm-erc20-0xdac17f958d2ee523a2206206994597c13d831ec7",
  },
  ARBITRUM_USDT: {
    id: "42161-evm-erc20-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  },
  OPTIMISM_USDT: {
    id: "10-evm-erc20-0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
  },
  MATIC_USDT: {
    id: "137-evm-erc20-0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  },
  ETH_USDC: {
    id: "1-evm-erc20-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  BASE_USDC: {
    id: "8453-evm-erc20-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  },
  ARBITRUM_USDC: {
    id: "42161-evm-erc20-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  },
  MATIC_USDC: {
    id: "137-evm-erc20-0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  },
  OPTIMISM_USDC: {
    id: "10-evm-erc20-0x0b2c639c533813f4aa9d7837caf62653d097ff85",
  },
  ETH_ETH: {
    id: "1-evm-native",
  },
  OPTIMISM_ETH: {
    id: "10-evm-native",
  },
  ARBITRUM_ETH: {
    id: "42161-evm-native",
  },
  BASE_ETH: {
    id: "8453-evm-native",
  },
  MATIC_ETH: {
    id: "137-evm-erc20-0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
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
          const chain = token?.evmNetwork
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
