import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getStakingAPR } from "../../helpers"
import { useBabeNetwork } from "./useBabeNetwork"

export const useStakingAPR = (chainId: DotNetworkId | null | undefined) => {
  const babeNetwork = useBabeNetwork(chainId)
  const { data: sapi } = useScaleApi(chainId)
  const { data: babeSapi } = useScaleApi(babeNetwork?.id)

  return useQuery({
    queryKey: ["useStakingAPR", babeSapi?.id],
    queryFn: () => {
      if (!sapi || !babeSapi) return null

      return getStakingAPR(sapi, babeSapi)
    },
    enabled: !!sapi && !!babeSapi,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
