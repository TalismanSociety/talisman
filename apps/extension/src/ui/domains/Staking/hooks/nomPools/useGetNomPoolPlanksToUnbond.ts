import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

import { NomPoolMember } from "../../types"

type GetNomPoolPlanksToUnbond = {
  pool: NomPoolMember | null | undefined
  sapi: ScaleApi | undefined | null
  isEnabled: boolean
}

export const useGetNomPoolPlanksToUnbond = ({
  pool,
  sapi,
  isEnabled,
}: GetNomPoolPlanksToUnbond) => {
  return useQuery({
    queryKey: ["pointsToBalance", sapi?.id, papiStringify(pool)],
    queryFn: async () => {
      if (!sapi || !pool) return null
      return sapi.getRuntimeCallValue("NominationPoolsApi", "points_to_balance", [
        pool.pool_id,
        pool.points,
      ])
    },
    enabled: isEnabled,
  })
}
