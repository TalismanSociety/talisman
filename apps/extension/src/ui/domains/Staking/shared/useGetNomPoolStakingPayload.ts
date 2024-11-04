import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

import { getNomPoolStakingPayload } from "../helpers"

type GetNomPoolStakingPayload = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null
  plancks: bigint | null
  hasJoinedNomPool: boolean
  withSetClaimPermission: boolean
}

export const useGetNomPoolStakingPayload = ({
  sapi,
  address,
  poolId,
  plancks,
  hasJoinedNomPool,
  withSetClaimPermission,
}: GetNomPoolStakingPayload) => {
  return useQuery({
    queryKey: [
      "getNomPoolStakingPayload",
      sapi?.id,
      address,
      poolId,
      plancks?.toString(),
      hasJoinedNomPool,
      withSetClaimPermission,
    ],
    queryFn: async () => {
      if (!sapi || !address || !poolId || !plancks) return null
      const response = getNomPoolStakingPayload(
        sapi,
        address,
        poolId,
        plancks,
        hasJoinedNomPool,
        withSetClaimPermission,
      )
      return response
    },
    enabled: !!sapi && !!address && !!poolId && !!plancks,
  })
}
