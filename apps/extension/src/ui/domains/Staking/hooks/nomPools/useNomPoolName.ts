import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { Binary } from "polkadot-api"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { cleanupNomPoolName } from "../../helpers"

export const useNomPoolName = (
  chainId: DotNetworkId | null | undefined,
  poolId: number | string | null | undefined,
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolName", sapi?.id, poolId],
    queryFn: async () => {
      if (!sapi) return null

      const metadata = await sapi.getStorage<Binary>("NominationPools", "Metadata", [poolId])

      return cleanupNomPoolName(metadata?.asText())
    },
    enabled: !!sapi,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
