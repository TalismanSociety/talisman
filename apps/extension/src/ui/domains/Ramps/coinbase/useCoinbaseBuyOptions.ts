import { useQuery } from "@tanstack/react-query"
import { RAMPS_COINBASE_API_BASE_PATH } from "extension-shared"
import urlJoin from "url-join"

import { CoinbaseBuyOptions } from "./types"

export const useCoinbaseBuyOptions = () => {
  return useQuery({
    queryKey: ["useCoinbaseBuyOptions"],
    queryFn: async (): Promise<CoinbaseBuyOptions> => {
      const res = await fetch(urlJoin(RAMPS_COINBASE_API_BASE_PATH, "/buy/options"))
      if (!res.ok) throw new Error("Failed to fetch coinbase buy config")
      return await res.json()
    },
  })
}
