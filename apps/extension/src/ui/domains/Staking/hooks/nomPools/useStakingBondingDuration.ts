import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getStakingBondingDurationMs } from "../../helpers"
import { useBabeNetwork } from "./useBabeNetwork"

export const useStakingBondingDuration = (chainId: DotNetworkId | null | undefined) => {
  const babeNetwork = useBabeNetwork(chainId)
  const { data: babeSapi } = useScaleApi(babeNetwork?.id)

  return useQuery({
    queryKey: ["useStakingBondingDuration", babeSapi?.id],
    queryFn: () => {
      if (!babeSapi) return null

      return getStakingBondingDurationMs(babeSapi)
    },
    enabled: !!babeSapi,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
