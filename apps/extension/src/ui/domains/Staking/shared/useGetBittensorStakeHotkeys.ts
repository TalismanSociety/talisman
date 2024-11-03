import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type GetBittensorStakeHotkeys = {
  chainId: ChainId | null | undefined
  address: string | null
}

export const useGetBittensorStakeHotkeys = ({ chainId, address }: GetBittensorStakeHotkeys) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["getBittensorStakeHotkeys", sapi?.id],
    queryFn: async () =>
      await sapi?.getStorage<string[]>("SubtensorModule", "StakingHotkeys", [address]),
    enabled: !!sapi && !!address && chainId === "bittensor",
  })
}
