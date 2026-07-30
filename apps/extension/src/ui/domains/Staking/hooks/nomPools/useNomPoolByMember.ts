import { isBittensorNetworkId } from "@core/domains/bittensor/exports"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import type { NomPoolMember } from "../../types"

export const useNomPoolByMember = (
  chainId: DotNetworkId | null | undefined,
  address: string | null | undefined
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
    enabled: !!sapi && !!address && !isBittensorNetworkId(chainId),
  })
}
