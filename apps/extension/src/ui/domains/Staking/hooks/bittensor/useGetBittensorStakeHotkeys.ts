import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type GetBittensorStakeHotkeys = {
  chainId: ChainId | null | undefined
  address: string | null | undefined
  totalStaked?: number
}

export const useGetBittensorStakeHotkeys = ({
  chainId,
  address,
  totalStaked,
}: GetBittensorStakeHotkeys) => {
  // this calls useScaleApi which downloads metadata from chain, we only want this to be done for bittensor
  const { data: sapi } = useScaleApi(chainId === "bittensor" ? "bittensor" : null)

  return useQuery({
    queryKey: ["getBittensorStakeHotkeys", sapi?.id, address, totalStaked],
    queryFn: async () =>
      await sapi?.getStorage<string[]>("SubtensorModule", "StakingHotkeys", [address]),
    enabled: !!sapi && !!address && chainId === "bittensor",
  })
}
