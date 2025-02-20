import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { NomPoolMember } from "../../types"

export const useNomPoolByMember = (
  chainId: ChainId | null | undefined,
  address: string | null | undefined,
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolByMember", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null
      return (
        (await sapi.getStorage<NomPoolMember | null>("NominationPools", "PoolMembers", [
          address,
        ])) ?? null
      )
    },
    enabled: !!sapi && !!address && chainId !== "bittensor",
  })
}
