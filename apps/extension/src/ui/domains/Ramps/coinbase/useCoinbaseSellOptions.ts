import { useQuery } from "@tanstack/react-query"
import { RAMPS_COINBASE_API_BASE_PATH } from "extension-shared"
import urlJoin from "url-join"

import { CoinbaseSellOptions } from "./types"

export const useCoinbaseSellOptions = () => {
  return useQuery({
    queryKey: ["useCoinbaseSellOptions"],
    queryFn: async (): Promise<CoinbaseSellOptions> => {
      const res = await fetch(urlJoin(RAMPS_COINBASE_API_BASE_PATH, "/sell/options"))
      if (!res.ok) throw new Error("Failed to fetch coinbase sell config")
      return await res.json()
    },
  })
}
