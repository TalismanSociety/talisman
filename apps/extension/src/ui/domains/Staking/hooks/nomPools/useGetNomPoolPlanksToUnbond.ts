import { ScaleApi } from "@talismn/sapi"
import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"

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

      // api has not been migrated to kusama asset hub yet
      if (!sapi.isApiAvailable("NominationPoolsApi", "points_to_balance")) return pool.points // cheating for now, because we know there is a 1:1 mapping

      return sapi.getRuntimeCallValue("NominationPoolsApi", "points_to_balance", [
        pool.pool_id,
        pool.points,
      ])
    },
    enabled: isEnabled,
  })
}
