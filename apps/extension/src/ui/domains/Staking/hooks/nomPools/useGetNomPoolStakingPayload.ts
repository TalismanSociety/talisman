import type { ScaleApi } from "@talismn/sapi"
import { useSignerPayloadQuery } from "@ui/hooks/sapi/useSignerPayloadQuery"
import { useMemo } from "react"

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
  const amount = useMemo(() => {
    // no minimum if already in pool
    if (plancks && hasJoinedNomPool) return plancks
    // must at least stake minJoinBond
    if (typeof minJoinBond === "bigint" && plancks && plancks >= minJoinBond) return plancks
    // default to minJoinBond
    return minJoinBond
  }, [hasJoinedNomPool, minJoinBond, plancks])

  return useSignerPayloadQuery({
    sapi,
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
        withSetClaimPermission
      )
      return response
    },
    enabled: !!sapi && !!address && !!poolId,
  })
}
