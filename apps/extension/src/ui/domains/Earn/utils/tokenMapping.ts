import { YieldDto } from "extension-core"
import { useMemo } from "react"

import { useTokens } from "@ui/state"

import { mapYieldNetworkToNetworkId } from "./networkMapping"

/**
 * Maps a YieldDto input token to a chaindata tokenId
 *
 * @param product - The yield product containing input tokens
 * @param tokens - Array of all available tokens from chaindata
 * @returns The tokenId if found, null otherwise
 */
export const mapYieldInputTokenToTokenId = (
  product: YieldDto,
  tokens: ReturnType<typeof useTokens>,
): string | null => {
  if (!product.inputTokens?.[0] || !tokens) return null

  const inputToken = product.inputTokens[0]
  const { symbol } = inputToken

  if (!symbol) return null

  // Get network from product's network property
  const networkId = mapYieldNetworkToNetworkId(product.network)
  if (!networkId) return null

  // Find tokens that match both symbol and networkId
  const matchingTokens = tokens.filter(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase() && token.networkId === networkId,
  )

  if (matchingTokens.length === 0) return null

  // Prioritize tokens: native tokens first, then tokens with logos, then any match
  const sortedTokens = matchingTokens.sort((a, b) => {
    // Native tokens first
    const aIsNative =
      a.type === "substrate-native" || a.type === "evm-native" || a.type === "sol-native"
    const bIsNative =
      b.type === "substrate-native" || b.type === "evm-native" || b.type === "sol-native"

    if (aIsNative && !bIsNative) return -1
    if (!aIsNative && bIsNative) return 1

    // Then tokens with logos
    const aHasLogo = !!a.logo
    const bHasLogo = !!b.logo

    if (aHasLogo && !bHasLogo) return -1
    if (!aHasLogo && bHasLogo) return 1

    return 0
  })

  return sortedTokens[0].id
}

/**
 * Maps a token symbol and network to a chaindata tokenId
 *
 * @param symbol - The token symbol
 * @param network - The yield network name
 * @param tokens - Array of all available tokens from chaindata
 * @returns The tokenId if found, null otherwise
 */
export const mapTokenSymbolToTokenId = (
  symbol: string,
  network: string,
  tokens: ReturnType<typeof useTokens>,
): string | null => {
  if (!symbol || !network || !tokens) return null

  // Map yield network name to our networkId
  const networkId = mapYieldNetworkToNetworkId(network)
  if (!networkId) return null

  // Find tokens that match both symbol and networkId
  const matchingTokens = tokens.filter(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase() && token.networkId === networkId,
  )

  if (matchingTokens.length === 0) return null

  // Prioritize tokens: native tokens first, then tokens with logos, then any match
  const sortedTokens = matchingTokens.sort((a, b) => {
    // Native tokens first
    const aIsNative =
      a.type === "substrate-native" || a.type === "evm-native" || a.type === "sol-native"
    const bIsNative =
      b.type === "substrate-native" || b.type === "evm-native" || b.type === "sol-native"

    if (aIsNative && !bIsNative) return -1
    if (!aIsNative && bIsNative) return 1

    // Then tokens with logos
    const aHasLogo = !!a.logo
    const bHasLogo = !!b.logo

    if (aHasLogo && !bHasLogo) return -1
    if (!aHasLogo && bHasLogo) return 1

    return 0
  })

  return sortedTokens[0].id
}

/**
 * Hook to get tokenId for a yield product
 *
 * @param product - The yield product
 * @returns The tokenId if found, null otherwise
 */
export const useYieldProductTokenId = (product: YieldDto | null): string | null => {
  const tokens = useTokens()

  return useMemo(() => {
    if (!product) return null
    return mapYieldInputTokenToTokenId(product, tokens)
  }, [product, tokens])
}
