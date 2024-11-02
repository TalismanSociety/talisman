import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

import { getNomPoolStakingPayload } from "../helpers"

type GetNomPoolFakeFeeEstimate = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null
  plancks: bigint | null
  hasJoinedNomPool: boolean
  withSetClaimPermission: boolean
  isFormValid: boolean
  minJoinBond: bigint | null | undefined
}

export const useGetNomPoolFakeFeeEstimate = ({
  sapi,
  address,
  poolId,
  minJoinBond,
  hasJoinedNomPool,
  withSetClaimPermission,
}: GetNomPoolFakeFeeEstimate) => {
  return useQuery({
    queryKey: [
      "getNomPoolStakingPayload/estimateFee",
      sapi?.id,
      poolId,
      address,
      minJoinBond?.toString(),
      hasJoinedNomPool,
      withSetClaimPermission,
    ],
    queryFn: async () => {
      if (!sapi || !address || !poolId || typeof minJoinBond !== "bigint") return null

      const { payload } = await getNomPoolStakingPayload(
        sapi,
        address,
        poolId,
        minJoinBond,
        hasJoinedNomPool,
        withSetClaimPermission,
      )
      return sapi.getFeeEstimate(payload)
    },
    enabled: !!sapi && !!address && !!poolId && !!minJoinBond,
  })
}
