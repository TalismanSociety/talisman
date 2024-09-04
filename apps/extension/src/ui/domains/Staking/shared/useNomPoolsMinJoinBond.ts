import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useNomPoolsMinJoinBond = (chainId: ChainId | null | undefined) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolsMinJoinBond", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null
      return (await sapi.getStorage<bigint>("NominationPools", "MinJoinBond", [])) ?? 0n
    },
  })
}
