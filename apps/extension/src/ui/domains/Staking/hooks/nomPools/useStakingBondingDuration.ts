import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getStakingBondingDurationMs } from "../../helpers"

export const useStakingBondingDuration = (chainId: ChainId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useStakingBondingDuration", sapi?.id],
    queryFn: () => {
      if (!sapi) return null

      return getStakingBondingDurationMs(sapi)
    },
    enabled: !!sapi,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
