import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getStakingAPR } from "../../helpers"

export const useStakingAPR = (chainId: DotNetworkId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useStakingAPR", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null

      const stop = log.timer(`useStakingAPR(${sapi.chainId})`)

      const apr = await getStakingAPR(sapi)

      stop()

      return apr
    },
    enabled: !!sapi,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
