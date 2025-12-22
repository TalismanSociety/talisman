import { DotNetworkId } from "@talismn/chaindata-provider"
import { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { RootClaimType, RootClaimTypeEnum } from "./types"

type SetBittensorClaimType = {
  networkId: DotNetworkId | null | undefined
  address: string | undefined
  claimType: RootClaimType
}

type GetExtrinsicPayload = {
  sapi: ScaleApi
  address: string
  claimType: RootClaimType
}

type ExtrinsicPayload = Awaited<ReturnType<typeof getExtrinsicPayload>>

const createRootClaimTypeEnum = (claimType: RootClaimType): RootClaimTypeEnum => ({
  type: claimType,
  value: undefined,
})

const getExtrinsicPayload = async ({ sapi, address, claimType }: GetExtrinsicPayload) => {
  if (!sapi || !address) return null

  return sapi.getExtrinsicPayload(
    "SubtensorModule",
    "set_root_claim_type",
    { new_root_claim_type: createRootClaimTypeEnum(claimType) },
    { address },
  )
}

export const useGetBittensorClaimTypePayload = ({
  networkId,
  address,
  claimType,
}: SetBittensorClaimType) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery<ExtrinsicPayload>({
    queryKey: ["setBittensorClaimType", sapi?.id, address, claimType],
    queryFn: async () => {
      if (!sapi || !address) return null

      return getExtrinsicPayload({ sapi, address, claimType })
    },
    enabled: !!sapi && !!address && !!claimType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
