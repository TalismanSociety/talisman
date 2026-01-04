import { DotNetworkId } from "@talismn/chaindata-provider"
import { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { RootClaimType, RootClaimTypeEnum } from "./types"

type SetBittensorClaimType = {
  networkId: DotNetworkId | null | undefined
  address: string | undefined
  claimType: RootClaimType
  selectedSubnets?: number[]
}

type GetExtrinsicPayload = {
  sapi: ScaleApi
  address: string
  claimType: RootClaimType
  selectedSubnets?: number[]
}

type ExtrinsicPayload = Awaited<ReturnType<typeof getExtrinsicPayload>>

const createRootClaimTypeEnum = (
  claimType: RootClaimType,
  selectedSubnets?: number[],
): RootClaimTypeEnum => {
  if (claimType === "KeepSubnets") {
    // Ensure subnets are plain numbers and sorted (chain may expect specific format)
    const subnets = (selectedSubnets ?? []).map((n) => Number(n)).sort((a, b) => a - b)
    return {
      type: "KeepSubnets",
      value: { subnets },
    }
  }
  return {
    type: claimType,
    value: undefined,
  } as RootClaimTypeEnum
}

const getExtrinsicPayload = async ({
  sapi,
  address,
  claimType,
  selectedSubnets,
}: GetExtrinsicPayload) => {
  if (!sapi || !address) return null

  return sapi.getExtrinsicPayload(
    "SubtensorModule",
    "set_root_claim_type",
    { new_root_claim_type: createRootClaimTypeEnum(claimType, selectedSubnets) },
    { address },
  )
}

export const useGetBittensorClaimTypePayload = ({
  networkId,
  address,
  claimType,
  selectedSubnets,
}: SetBittensorClaimType) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery<ExtrinsicPayload>({
    queryKey: ["setBittensorClaimType", sapi?.id, address, claimType, selectedSubnets],
    queryFn: async () => {
      if (!sapi || !address) return null

      return getExtrinsicPayload({ sapi, address, claimType, selectedSubnets })
    },
    enabled: !!sapi && !!address && !!claimType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
