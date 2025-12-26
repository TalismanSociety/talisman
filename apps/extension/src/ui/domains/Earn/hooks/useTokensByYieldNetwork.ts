// import { useMemo } from "react"

// interface UserToken {
//   symbol: string
//   logoURI?: string
//   networkId: string
//   tokenId: string
//   tokenAddress?: string
// }

// export interface GroupedToken {
//   tokenSymbol: string
//   tokenLogoURI?: string
//   networkId: string
//   tokenId: string
//   tokenAddress?: string
// }

// /**
//  * Custom hook to group user tokens by yield network
//  * Uses a simplified approach to avoid hook issues
//  */
// export const useTokensByYieldNetwork = (
//   userTokens: UserToken[],
//   allowedNetworks: string[],
//   yieldxyzNetworks: Record<string, string> = {},
// ): Record<string, GroupedToken[]> => {
//   // Group tokens by yield network
//   return useMemo(() => {
//     const grouped: Record<string, GroupedToken[]> = {}

//     // Create reverse mapping from network ID to yield network name
//     const networkIdToYieldNetwork = Object.entries(yieldxyzNetworks).reduce(
//       (acc, [yieldNetwork, networkId]) => {
//         acc[networkId] = yieldNetwork
//         return acc
//       },
//       {} as Record<string, string>,
//     )

//     userTokens.forEach((userToken) => {
//       // Map network ID to yield network name
//       const yieldNetwork = networkIdToYieldNetwork[userToken.networkId]

//       // Check if this yield network is in the allowed networks
//       if (!yieldNetwork || !allowedNetworks.includes(yieldNetwork)) return

//       if (!grouped[yieldNetwork]) {
//         grouped[yieldNetwork] = []
//       }

//       // Use token address if available, fallback to symbol
//       grouped[yieldNetwork].push({
//         tokenSymbol: userToken.symbol,
//         tokenLogoURI: userToken.logoURI,
//         networkId: userToken.networkId,
//         tokenId: userToken.tokenId,
//         tokenAddress: userToken.tokenAddress,
//       })
//     })
//     return grouped
//   }, [userTokens, allowedNetworks, yieldxyzNetworks])
// }
