import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useCurrentStakingEra = (chainId: DotNetworkId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useCurrentStakingEra", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null
      return (await sapi.getStorage<number>("Staking", "CurrentEra", [])) ?? null
    },
  })
}
