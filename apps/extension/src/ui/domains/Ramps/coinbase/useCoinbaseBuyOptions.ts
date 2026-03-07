import { RAMPS_COINBASE_API_BASE_PATH } from "@common/constants"
import { useQuery } from "@tanstack/react-query"
import urlJoin from "url-join"

import type { CoinbaseBuyOptions } from "./types"

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
