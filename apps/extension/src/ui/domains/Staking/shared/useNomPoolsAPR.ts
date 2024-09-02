import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"
import { log } from "extension-shared"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getNomPoolsAPR } from "../helpers"

export const useNomPoolsAPR = (chainId: ChainId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolsAPR", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null

      const stop = log.timer(`getNomPoolsAPR(${sapi.chainId})`)

      const apr = await getNomPoolsAPR(sapi)

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
