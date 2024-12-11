import { useQueries, useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type GetBittensorStakeHotkeys = {
  chainId: ChainId | null | undefined
  address: string | null | undefined
  totalStaked?: number
}

type GetBittensorStakesHotkeys = Omit<GetBittensorStakeHotkeys, "address"> & { addresses: string[] }

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

export const useGetBittensorStakesHotkeys = ({
  chainId,
  addresses,
  totalStaked,
}: GetBittensorStakesHotkeys) => {
  const { data: sapi } = useScaleApi(chainId)
  return useQueries({
    queries: addresses.map((address) => ({
      queryKey: ["getBittensorStakeHotkeys", sapi?.id, address, totalStaked],
      queryFn: () => sapi?.getStorage<string[]>("SubtensorModule", "StakingHotkeys", [address]),
      enabled: !!sapi && !!address && chainId === "bittensor",
    })),
    combine: (results) => {
      return {
        data: results.map((result) => result.data),
        isPending: results.some((result) => result.isPending),
        isLoading: results.some((result) => result.isLoading),
        error: results.find((result) => result.isError),
      }
    },
  })
}
