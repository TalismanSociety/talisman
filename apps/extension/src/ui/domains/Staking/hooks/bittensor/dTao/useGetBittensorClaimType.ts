import type { DotNetworkId } from "@talismn/chaindata-provider"
import { sleep } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { DEFAULT_ROOT_CLAIM_TYPE } from "@ui/domains/Staking/Bittensor/utils/constants"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import type { RootClaimType, RootClaimTypeEnum } from "./types"

type GetBittensorClaimType = {
  networkId: DotNetworkId | null | undefined
  address: string | undefined
}

type ClaimTypeResult = {
  claimType: RootClaimType
  subnets?: number[]
}

export const useGetBittensorClaimType = ({ networkId, address }: GetBittensorClaimType) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery<ClaimTypeResult | null>({
    queryKey: ["useGetBittensorClaimType", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null

      await sleep(4000)

      const result = await sapi.getStorage<RootClaimTypeEnum>("SubtensorModule", "RootClaimType", [
        address,
      ])

      const claimType = result?.type ?? DEFAULT_ROOT_CLAIM_TYPE

      // Ensure subnets are plain numbers (chain may return them as different types)
      const subnets =
        result?.type === "KeepSubnets" ? result.value?.subnets?.map((n) => Number(n)) : undefined

      return {
        claimType,
        subnets,
      }
    },
    gcTime: 0, // force refresh when popup reopens
    enabled: !!sapi && !!address,
  })
}
