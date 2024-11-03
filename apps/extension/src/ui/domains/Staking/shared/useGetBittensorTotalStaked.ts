import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

type GetBittensorTotalStaked = {
  sapi: ScaleApi | undefined | null
  address: string | undefined
  isEnabled: boolean
}

export const useGetBittensorTotalStaked = ({
  sapi,
  address,
  isEnabled,
}: GetBittensorTotalStaked) => {
  return useQuery({
    queryKey: ["getBittensorTotalStaked", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null
      return sapi.getStorage<bigint>("SubtensorModule", "TotalColdkeyStake", [address])
    },
    enabled: !!sapi && !!address && isEnabled,
  })
}
