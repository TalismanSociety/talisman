import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { ScaleApi } from "@ui/util/scaleApi"

import { getBittensorStakingPayload } from "../../helpers"

type GetBittensorStakingPayload = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null | undefined
  plancks: bigint | null
  isEnabled: boolean
  minJoinBond: bigint | null | undefined
}

export const useGetBittensorStakingPayload = ({
  sapi,
  address,
  poolId,
  plancks,
  isEnabled,
  minJoinBond,
}: GetBittensorStakingPayload) => {
  // use minJoinBond to get an accurate a 'fake fee estimate' if the amount is 0 or less than minJoinBond
  const amount = useMemo(
    () => (!!minJoinBond && plancks && plancks >= minJoinBond ? plancks : minJoinBond),
    [minJoinBond, plancks],
  )

  return useQuery({
    queryKey: ["getBittensorStakingPayload", sapi?.id, address, poolId, amount?.toString() ?? "0"],
    queryFn: async () => {
      if (!sapi || !address || !poolId) return null
      const response = getBittensorStakingPayload({ sapi, address, poolId, amount: amount ?? 0n })
      return response
    },
    enabled: !!sapi && !!address && !!poolId && isEnabled,
  })
}
