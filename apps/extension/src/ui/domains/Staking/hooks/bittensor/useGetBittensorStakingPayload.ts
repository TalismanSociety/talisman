import { ScaleApi } from "@talismn/sapi"
import { tokensToPlanck } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { type StakeType } from "../../Bittensor/hooks/useBittensorBondWizard"
import { getBittensorStakingPayload } from "../../helpers"

type GetBittensorStakingPayload = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null | undefined
  plancks: bigint | null
  isEnabled: boolean
  minJoinBond: bigint | null | undefined
  stakeType: StakeType
  alphaPriceWithSlippage: number
  netuid: number | null
  talismanFee: bigint
}

export const useGetBittensorStakingPayload = ({
  sapi,
  address,
  poolId,
  plancks,
  isEnabled,
  minJoinBond,
  stakeType,
  alphaPriceWithSlippage,
  netuid,
  talismanFee,
}: GetBittensorStakingPayload) => {
  // use minJoinBond to get an accurate a 'fake fee estimate' if the amount is 0 or less than minJoinBond
  const amount = useMemo(
    () => (!!minJoinBond && plancks && plancks >= minJoinBond ? plancks : minJoinBond || 0n),
    [minJoinBond, plancks],
  )

  // use a mocked hotkey to get a 'fake fee estimate' if the user has no delegator selected
  const hotkey = useMemo(() => {
    const MOCKED_HOTKEY = "5HK5tp6t2S59DywmHRWPBVJeJ86T61KjurYqeooqj8sREpeN"
    return poolId || MOCKED_HOTKEY
  }, [poolId])

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
      poolId,
      amount?.toString() ?? "0",
      stakeType,
      alphaPriceWithSlippage,
      netuid,
    ],
    queryFn: async () => {
      if (!sapi || !address) return null
      const response = getBittensorStakingPayload({
        sapi,
        address,
        poolId: hotkey,
        amount: amount,
        stakeType,
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
