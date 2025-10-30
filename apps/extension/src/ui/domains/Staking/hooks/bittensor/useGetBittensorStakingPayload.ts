import { ScaleApi } from "@talismn/sapi"
import { tokensToPlanck } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { getBittensorStakingPayload } from "../../helpers"

type GetBittensorStakingPayload = {
  sapi: ScaleApi | undefined | null
  address: string | null
  hotkey: string | null | undefined
  plancks: bigint | null
  isEnabled: boolean
  minJoinBond: bigint | null | undefined
  alphaPriceWithSlippage: number
  netuid: number | null
  talismanFee: bigint
}

const MOCKED_HOTKEY = "5HK5tp6t2S59DywmHRWPBVJeJ86T61KjurYqeooqj8sREpeN"

export const useGetBittensorStakingPayload = ({
  sapi,
  address,
  hotkey = MOCKED_HOTKEY, //  use a mocked hotkey to get a 'fake fee estimate' if the user has no delegator selected
  plancks,
  isEnabled,
  minJoinBond,
  alphaPriceWithSlippage,
  netuid,
  talismanFee,
}: GetBittensorStakingPayload) => {
  // use minJoinBond to get an accurate a 'fake fee estimate' if the amount is 0 or less than minJoinBond
  const amount = useMemo(
    () => (!!minJoinBond && plancks && plancks >= minJoinBond ? plancks : minJoinBond || 0n),
    [minJoinBond, plancks],
  )

  const tokenDecimals = 9

  const alphaPriceWithSlippagePlanks = useMemo(() => {
    const planks = tokensToPlanck(String(alphaPriceWithSlippage), tokenDecimals)
    const rounded = Math.round(parseFloat(planks))
    return BigInt(rounded)
  }, [alphaPriceWithSlippage])

  return useQuery({
    queryKey: [
      "getBittensorStakingPayload",
      sapi?.id,
      address,
      hotkey,
      amount?.toString() ?? "0",
      alphaPriceWithSlippage,
      netuid,
    ],
    queryFn: async () => {
      if (!sapi || !address || !hotkey) return null
      if (typeof netuid !== "number") return null
      const response = getBittensorStakingPayload({
        sapi,
        address,
        hotkey,
        amount,
        alphaPriceWithSlippagePlanks,
        netuid,
        talismanFee,
      })
      return response
    },
    enabled: !!sapi && !!address && isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
