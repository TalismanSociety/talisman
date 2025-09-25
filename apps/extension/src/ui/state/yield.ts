import { useQuery } from "@tanstack/react-query"
import { fetchYieldProducts, YieldProductsFilter } from "extension-core"

/**
 * Hook to fetch yield products for earning opportunities
 * Uses React Query for caching and error handling
 */
export const useYieldProducts = (filter?: YieldProductsFilter) => {
  return useQuery({
    queryKey: ["yieldProducts", filter],
    queryFn: () => fetchYieldProducts(filter),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute for fresh APY data
    refetchOnWindowFocus: false,
    retry: 2,
  })
}
