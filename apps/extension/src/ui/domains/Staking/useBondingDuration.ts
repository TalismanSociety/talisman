import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getNomPoolsBondingDurationMs } from "./helpers"

export const useNomPoolsBondingDuration = (chainId: ChainId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolsBondingDuration", sapi?.id],
    queryFn: () => {
      if (!sapi) return null

      return getNomPoolsBondingDurationMs(sapi)
    },
    enabled: !!sapi,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
