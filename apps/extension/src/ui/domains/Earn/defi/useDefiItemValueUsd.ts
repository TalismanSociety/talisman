import type { DefiPosition, DefiPositionItem } from "@core/domains/defi/exports"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  type Network,
  type NetworkId,
  solNativeTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import type { TokenRatesList } from "@talismn/token-rates"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { resolveSolanaMintTokenId } from "@ui/util/solana/resolveSolanaMintTokenId"
import { useMemo } from "react"
import { formatUnits } from "viem"

export const resolveDefiTokenId = (
  networkId: string,
  contractAddress: string | null,
  networksMap: Record<NetworkId, Network>,
  tokensMap: Record<string, unknown>
): TokenId | null => {
  const network = networksMap[networkId]
  if (!network) return null

  let tokenId: string | null = null
  switch (network.platform) {
    case "ethereum":
      tokenId = contractAddress
        ? evmErc20TokenId(networkId, contractAddress as `0x${string}`)
        : evmNativeTokenId(networkId)
      break
    case "solana":
      tokenId = contractAddress
        ? resolveSolanaMintTokenId(networkId, contractAddress, tokensMap)
        : solNativeTokenId(networkId)
      break
    case "polkadot":
      if (!contractAddress) tokenId = subNativeTokenId(networkId)
      break
  }

  return tokenId && tokensMap[tokenId] ? (tokenId as TokenId) : null
}

/**
 * Calculates the USD value for a DeFi position item using our own token rates.
 * Falls back to the API-provided valueUsd when we don't have our own rate data.
 */
export const calcDefiItemValueUsd = (
  item: DefiPositionItem,
  networkId: string,
  networksMap: Record<NetworkId, Network>,
  tokensMap: Record<string, unknown>,
  tokenRatesMap: TokenRatesList
): number => {
  try {
    const tokenId = resolveDefiTokenId(networkId, item.contract_address, networksMap, tokensMap)
    if (!tokenId) return item.valueUsd

    const usdRate = tokenRatesMap[tokenId]?.usd?.price
    if (usdRate == null) return item.valueUsd

    const tokens = Number(formatUnits(BigInt(item.amount), item.decimals))
    return tokens * usdRate
  } catch {
    return item.valueUsd
  }
}

export const useDefiItemValueUsd = (item: DefiPositionItem, networkId: string): number => {
  const networksMap = useNetworksMapById()
  const tokensMap = useTokensMap()
  const tokenRatesMap = useTokenRatesMap()

  return useMemo(
    () => calcDefiItemValueUsd(item, networkId, networksMap, tokensMap, tokenRatesMap),
    [item, networkId, networksMap, tokensMap, tokenRatesMap]
  )
}

export const useDefiPositionTotalValueUsd = (position: DefiPosition): number => {
  const networksMap = useNetworksMapById()
  const tokensMap = useTokensMap()
  const tokenRatesMap = useTokenRatesMap()

  return useMemo(
    () =>
      position.breakdown.reduce(
        (sum, item) =>
          sum +
          calcDefiItemValueUsd(item, position.networkId, networksMap, tokensMap, tokenRatesMap),
        0
      ),
    [position, networksMap, tokensMap, tokenRatesMap]
  )
}
