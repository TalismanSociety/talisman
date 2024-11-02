import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

import { getBittensorStakingPayload } from "../helpers"

type GetBittensorStakingPayload = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null
  plancks: bigint | null
  isFormValid: boolean
  isEnabled: boolean
}

export const useGetBittensorStakingPayload = ({
  sapi,
  address,
  poolId,
  plancks,
  isFormValid,
  isEnabled,
}: GetBittensorStakingPayload) => {
  return useQuery({
    queryKey: [
      "getBittensorStakingPayload",
      sapi?.id,
      address,
      poolId,
      plancks?.toString(),
      isFormValid,
    ],
    queryFn: async () => {
      if (!sapi || !address || !poolId || !plancks) return null
      const response = getBittensorStakingPayload({ sapi, address, poolId, amount: plancks })
      return response
    },
    enabled: !!sapi && !!address && !!poolId && !!plancks && isFormValid && isEnabled,
  })
}
