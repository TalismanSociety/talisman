// import { useQuery } from "@tanstack/react-query"
// import { Networks, YieldDto } from "extension-core"

// /**
//  * Hook to fetch yield products for multiple tokens on a specific network
//  * Uses React Query for caching and error handling
//  * Batches API calls by network instead of per-token
//  */
// export const useYieldProductsByNetwork = (network: Networks, tokenAddresses: string[]) => {
//   return useQuery({
//     queryKey: ["yieldProductsByNetwork", network, tokenAddresses.sort()],
//     queryFn: () => [] as YieldDto[], // fetchYieldProductsByNetwork(network, tokenAddresses),
//     enabled: !!network && tokenAddresses.length > 0,
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute for fresh APY data
//     refetchOnWindowFocus: false,
//     retry: 2,
//   })
// }
