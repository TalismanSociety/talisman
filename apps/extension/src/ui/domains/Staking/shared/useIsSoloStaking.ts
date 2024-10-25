import { ChainId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useIsSoloStaking = (
  chainId: ChainId | null | undefined,
  address: string | null | undefined,
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useIsSoloStaking", chainId],
    queryFn: async () => {
      if (!sapi || !address) return null
      const isSoloStaking = await sapi.getStorage("Staking", "Bonded", [address])
      return !!isSoloStaking
    },
    enabled: !!sapi,
  })
}
