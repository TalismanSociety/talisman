import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { NomPoolsClaimPermission } from "../types"

export const useNomPoolsClaimPermission = (
  chainId: ChainId | null | undefined,
  address: string | null | undefined,
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolsClaimPermission", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null
      const result = await sapi.getStorage<NomPoolsClaimPermission>(
        "NominationPools",
        "ClaimPermissions",
        [address],
      )

      return result?.type ?? "Permissioned"
    },
  })
}
