import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"
import { log } from "extension-shared"

import { useScaleApi } from "@ui/hooks/useScaleApi"

import { getNomPoolsBondingDurationMs } from "./helpers"

export const useNomPoolsBondingDuration = (chainId: ChainId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolsBondingDuration", chainId, sapi?.id],
    queryFn: () => {
      if (!sapi || !chainId) return null

      const stop = log.timer(`useNomPoolsBondingDuration(${chainId})`)

      const apr = getNomPoolsBondingDurationMs(sapi)

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
