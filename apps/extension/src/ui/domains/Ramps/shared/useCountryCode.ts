import { useQuery } from "@tanstack/react-query"
import { RAMPS_COINBASE_API_BASE_PATH } from "extension-shared"
import urlJoin from "url-join"

export const useCountryCode = () => {
  return useQuery({
    queryKey: ["useCountryCode"],
    queryFn: async (): Promise<{ countryCode: string; regionCode: string | null }> => {
      const res = await fetch(urlJoin(RAMPS_COINBASE_API_BASE_PATH, "/country"))
      if (!res.ok) throw new Error("Failed to fetch country code")
      return await res.json()
    },
    enabled: true,
    refetchInterval: false,
  })
}
