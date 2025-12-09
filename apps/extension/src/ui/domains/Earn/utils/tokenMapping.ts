import { YieldDto } from "extension-core"

import { useTokens } from "@ui/state"

import { mapYieldNetworkToNetworkId } from "./networkMapping"
// import { mapYieldNetworkToNetworkId } from "./networkMapping"
import { getYieldxyzTokenAddress } from "./tokenUtils"

/**
 * Maps a YieldDto input token to a chaindata tokenId
 * @deprecated DO NOT USE
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
  const { symbol, address } = inputToken

  if (!symbol) return null

  // Get network from product's network property
  const networkId = mapYieldNetworkToNetworkId(product.network)
  if (!networkId) return null

  // First try to match by address if both yield product and chaindata have addresses
  if (address) {
    const addressMatches = tokens.filter((token) => {
      const tokenAddress = getYieldxyzTokenAddress(token)
      return (
        tokenAddress &&
        tokenAddress.toLowerCase() === address.toLowerCase() &&
        token.networkId === networkId
      )
    })

    if (addressMatches.length > 0) {
      // Prioritize exact address matches
      return addressMatches[0].id
    }
  }

  // Fallback to symbol matching
  const symbolMatches = tokens.filter(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase() && token.networkId === networkId,
  )

  if (symbolMatches.length === 0) return null

  // Prioritize tokens: native tokens first, then tokens with logos, then any match
  const sortedTokens = symbolMatches.sort((a, b) => {
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
 * Maps a token identifier (address or symbol) and network to a chaindata tokenId
 * @deprecated DO NOT USE
 * @param identifier - The token address or symbol
 * @param network - The yield network name
 * @param tokens - Array of all available tokens from chaindata
 * @returns The tokenId if found, null otherwise
 */
export const mapYieldTokenToTokenId = (
  identifier: string,
  network: string,
  tokens: ReturnType<typeof useTokens>,
): string | null => {
  if (!identifier || !network || !tokens) return null

  // Map yield network name to our networkId
  const networkId = mapYieldNetworkToNetworkId(network)
  if (!networkId) return null

  // Check if identifier looks like an address (starts with 0x for EVM or matches address patterns)
  const isAddress = identifier.startsWith("0x") || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(identifier)

  if (isAddress) {
    // Try to match by address first
    const addressMatches = tokens.filter((token) => {
      const tokenAddress = getYieldxyzTokenAddress(token)
      return (
        tokenAddress &&
        tokenAddress.toLowerCase() === identifier.toLowerCase() &&
        token.networkId === networkId
      )
    })

    if (addressMatches.length > 0) {
      return addressMatches[0].id
    }
  }

  // Fallback to symbol matching
  const symbolMatches = tokens.filter(
    (token) =>
      token.symbol.toLowerCase() === identifier.toLowerCase() && token.networkId === networkId,
  )

  if (symbolMatches.length === 0) return null

  // Prioritize tokens: native tokens first, then tokens with logos, then any match
  const sortedTokens = symbolMatches.sort((a, b) => {
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
 * @deprecated Use mapYieldTokenToTokenId instead
 */
// export const mapTokenSymbolToTokenId = mapYieldTokenToTokenId

/**
 * Hook to get tokenId for a yield product
 *
 * @param product - The yield product
 * @returns The tokenId if found, null otherwise
 */
// export const useYieldProductTokenId = (product: YieldDto | null): string | null => {
//   const tokens = useTokens()

//   return useMemo(() => {
//     if (!product) return null
//     return mapYieldInputTokenToTokenId(product, tokens)
//   }, [product, tokens])
// }
