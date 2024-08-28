import { Binary } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useNomPoolName = (
  chainId: ChainId | null | undefined,
  poolId: number | null | undefined
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolName", sapi?.id, poolId],
    queryFn: async () => {
      if (!sapi) return null

      const metadata = await sapi.getStorage<Binary>("NominationPools", "Metadata", [poolId])

      return metadata?.asText().replace(/:\s?app\.talisman\.xyz\/staking/gi, "") ?? null
    },
    enabled: !!sapi,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
