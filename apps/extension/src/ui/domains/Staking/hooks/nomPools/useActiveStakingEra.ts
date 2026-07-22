import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useActiveStakingEra = (chainId: DotNetworkId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useActiveStakingEra", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null
      // unlock chunks become withdrawable based on the active era, not the planned one (CurrentEra)
      const activeEra = await sapi.getStorage<{ index: number } | null>("Staking", "ActiveEra", [])
      return activeEra?.index ?? null
    },
  })
}
