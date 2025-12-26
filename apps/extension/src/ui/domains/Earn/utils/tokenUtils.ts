// import { Balances } from "@talismn/balances"
// import { Token } from "@talismn/chaindata-provider"
// import { useMemo } from "react"

// import { useBalances, useTokens } from "@ui/state"

// /**
//  * Extracts the contract/address field from a token based on its type
//  * @param token - The token to extract address from
//  * @returns The token address if available, null for native tokens
//  */
// export const getYieldxyzTokenAddress = (token: Token | null | undefined): string | null => {
//   if (!token) return null

//   // yield doesnt support psp22 tokens for now
//   switch (token.type) {
//     case "evm-erc20":
//       return token.contractAddress
//     case "sol-spl":
//       return token.mintAddress
//     default:
//       return null
//   }
// }

// /**
//  * Gets all tokens with the same symbol across different networks
//  * @param tokenSymbol - The token symbol to search for
//  * @param allTokens - Array of all available tokens
//  * @param userBalances - Optional user balances to filter by
//  * @returns Array of tokens with matching symbol
//  */
// export const getTokensBySymbol = (
//   tokenSymbol: string,
//   allTokens: Token[],
//   userBalances?: Balances,
// ): Token[] => {
//   if (!tokenSymbol || !allTokens) return []

//   const matchingTokens = allTokens.filter(
//     (token) => token.symbol.toLowerCase() === tokenSymbol.toLowerCase(),
//   )

//   // If user balances are provided, filter to only networks where user has balance
//   if (userBalances) {
//     return matchingTokens.filter((token) => {
//       const hasBalance = userBalances.each.some(
//         (balance) => balance.tokenId === token.id && balance.total.planck > 0n,
//       )
//       return hasBalance
//     })
//   }

//   return matchingTokens
// }

// /**
//  * Hook to get all tokens with the same symbol for the current user
//  * @param tokenSymbol - The token symbol to search for
//  * @param filterByBalance - Whether to only show networks where user has balance
//  * @returns Array of tokens with matching symbol
//  */
// export const useTokensBySymbol = (tokenSymbol: string, filterByBalance: boolean = true) => {
//   const allTokens = useTokens()
//   const userBalances = useBalances("owned")

//   return useMemo(() => {
//     if (!tokenSymbol) return []

//     const tokens = getTokensBySymbol(
//       tokenSymbol,
//       allTokens,
//       filterByBalance ? userBalances : undefined,
//     )

//     // Sort by network priority (mainnet first, then testnet)
//     return tokens.sort((a, b) => {
//       const aIsTestnet = a.networkId.includes("testnet")
//       const bIsTestnet = b.networkId.includes("testnet")

//       if (aIsTestnet && !bIsTestnet) return 1
//       if (!aIsTestnet && bIsTestnet) return -1
//       return 0
//     })
//   }, [tokenSymbol, allTokens, userBalances, filterByBalance])
// }
