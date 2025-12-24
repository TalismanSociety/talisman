import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { DEFAULT_ROOT_CLAIM_TYPE } from "@ui/domains/Staking/Bittensor/utils/constants"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { RootClaimType, RootClaimTypeEnum } from "./types"

type GetBittensorClaimType = {
  networkId: DotNetworkId | null | undefined
  address: string | undefined
}

export const useGetBittensorClaimType = ({ networkId, address }: GetBittensorClaimType) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery<RootClaimType | null>({
    queryKey: ["useGetBittensorClaimType", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null

      const result = await sapi.getStorage<RootClaimTypeEnum>("SubtensorModule", "RootClaimType", [
        address,
      ])

      return result?.type ?? DEFAULT_ROOT_CLAIM_TYPE
    },
    enabled: !!sapi && !!address,
  })
}
