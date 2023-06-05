import { getCoinGeckoTokenRates } from "@core/util/coingecko/getCoinGeckoTokenRates"
import { useQuery } from "@tanstack/react-query"

export const useCoinGeckoTokenRates = (coingeckoId?: string) => {
  return useQuery({
    queryKey: ["useCoinGeckoTokenRates", coingeckoId],
    refetchInterval: 300_000, // 5 mins
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: () => getCoinGeckoTokenRates(coingeckoId),
  })
}
