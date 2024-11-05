import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type GetBittensorMinJoinBond = {
  chainId: ChainId | null | undefined
}

export const useGetBittensorMinJoinBond = ({ chainId }: GetBittensorMinJoinBond) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useGetBittensorMinJoinBond", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null
      return (
        (await sapi.getStorage<bigint>("SubtensorModule", "NominatorMinRequiredStake", [])) ?? 0n
      )
    },
    enabled: !!sapi && chainId === "bittensor",
  })
}
