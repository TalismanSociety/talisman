import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

import { getBittensorStakingPayload } from "../helpers"

type GetBittensorStakingPayload = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null
  plancks: bigint | null
  isEnabled: boolean
}

export const useGetBittensorStakingPayload = ({
  sapi,
  address,
  poolId,
  plancks,
  isEnabled,
}: GetBittensorStakingPayload) => {
  return useQuery({
    queryKey: ["getBittensorStakingPayload", sapi?.id, address, poolId, plancks?.toString()],
    queryFn: async () => {
      if (!sapi || !address || !poolId) return null
      const response = getBittensorStakingPayload({ sapi, address, poolId, amount: plancks ?? 0n })
      return response
    },
    enabled: !!sapi && !!address && !!poolId && isEnabled,
  })
}
