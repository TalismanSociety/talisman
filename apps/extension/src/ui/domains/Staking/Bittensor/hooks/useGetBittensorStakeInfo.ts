import { ScaleApi } from "@talismn/sapi"
import { ChainId } from "extension-core"

import { useGetBittensorStakeHotkeys } from "../../hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetBittensorStakingPayload } from "../../hooks/bittensor/useGetBittensorStakingPayload"
import { useGetFeeEstimate } from "../../shared/useGetFeeEstimate"
import { useGetMinJoinBond } from "../../shared/useGetMinJoinBond"

type GetStakeInfo = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null | undefined
  plancks: bigint | null
  chainId: ChainId | undefined
}

export const useGetBittensorStakeInfo = ({
  sapi,
  address,
  poolId,
  plancks,
  chainId,
}: GetStakeInfo) => {
  const { data: minJoinBond } = useGetMinJoinBond(chainId)

  const bittensorStakingPayload = useGetBittensorStakingPayload({
    sapi,
    address,
    poolId,
    plancks,
    minJoinBond,
    isEnabled: true,
  })

  const hotkeys = useGetBittensorStakeHotkeys({ address, chainId })

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = bittensorStakingPayload

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload })

  return {
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    currentPoolId: hotkeys?.[0] ?? poolId,
    minJoinBond,
  }
}
