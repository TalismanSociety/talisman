import { RAMPS_COINBASE_API_BASE_PATH } from "@common/extension-shared/constants"
import { useQuery } from "@tanstack/react-query"
import urlJoin from "url-join"

import type { CoinbaseSellOptions } from "./types"

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
