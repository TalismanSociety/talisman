import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { ScaleApi } from "@ui/util/scaleApi"

import { getNomPoolStakingPayload } from "../../helpers"

type GetNomPoolStakingPayload = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null | undefined
  plancks: bigint | null
  minJoinBond: bigint | null | undefined
  hasJoinedNomPool: boolean
  withSetClaimPermission: boolean
}

export const useGetNomPoolStakingPayload = ({
  sapi,
  address,
  poolId,
  plancks,
  hasJoinedNomPool,
  withSetClaimPermission,
  minJoinBond,
}: GetNomPoolStakingPayload) => {
  // use minJoinBond to get an accurate a 'fake fee estimate' if the amount is 0 or less than minJoinBond
  const amount = useMemo(
    () => (!!minJoinBond && plancks && plancks >= minJoinBond ? plancks : minJoinBond),
    [minJoinBond, plancks],
  )

  return useQuery({
    queryKey: [
      "getNomPoolStakingPayload",
      sapi?.id,
      address,
      poolId,
      amount?.toString() ?? "0",
      hasJoinedNomPool,
      withSetClaimPermission,
    ],
    queryFn: async () => {
      if (!sapi || !address || !poolId) return null
      const response = getNomPoolStakingPayload(
        sapi,
        address,
        poolId,
        amount ?? 0n,
        hasJoinedNomPool,
        withSetClaimPermission,
      )
      return response
    },
    enabled: !!sapi && !!address && !!poolId,
  })
}
