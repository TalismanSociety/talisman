import { ChainId } from "extension-core"

import { ScaleApi } from "@ui/util/scaleApi"

import { useGetBittensorStakeHotkeys } from "./useGetBittensorStakeHotkeys"
import { useGetBittensorTotalStaked } from "./useGetBittensorTotalStaked"
import { useGetBittensorUnbondPayload } from "./useGetBittensorUnbondPayload"
import { useGetFeeEstimate } from "./useGetFeeEstimate"
import { useGetNomPoolPlanksToUnbond } from "./useGetNomPoolPlanksToUnbond"
import { useGetNomPoolUnbondPayload } from "./useGetNomPoolUnbondPayload"
import { useNomPoolByMember } from "./useNomPoolByMember"

type GetUnbondInfo = {
  sapi: ScaleApi | undefined | null
  chainId: ChainId | undefined
  address: string | undefined
}

export const useGetUnbondInfo = ({ sapi, chainId, address }: GetUnbondInfo) => {
  const { data: pool } = useNomPoolByMember(chainId, address)
  const { data: nomPoolPlanksToUnbond } = useGetNomPoolPlanksToUnbond({
    sapi,
    pool,
    isEnabled: chainId !== "bittensor",
  })
  const nomPoolUnbondPayload = useGetNomPoolUnbondPayload({
    sapi,
    address,
    pool,
    isEnabled: chainId !== "bittensor",
  })
  const { data: totalTaoStaked } = useGetBittensorTotalStaked({
    sapi,
    address,
    isEnabled: chainId === "bittensor",
  })

  const { data: hotkeys } = useGetBittensorStakeHotkeys({ chainId, address })

  const bittensorUnbondPayload = useGetBittensorUnbondPayload({
    sapi,
    address,
    hotkey: hotkeys?.[0],
    isEnabled: chainId === "bittensor",
    plancks: totalTaoStaked,
  })

  let payloadAndMetadata, isLoadingPayload, errorPayload
  let plancksToUnbond

  switch (chainId) {
    case "bittensor":
      payloadAndMetadata = bittensorUnbondPayload.data
      isLoadingPayload = bittensorUnbondPayload.isLoading
      errorPayload = bittensorUnbondPayload.error
      plancksToUnbond = totalTaoStaked
      break
    default:
      payloadAndMetadata = nomPoolUnbondPayload.data
      isLoadingPayload = nomPoolUnbondPayload.isLoading
      errorPayload = nomPoolUnbondPayload.error
      plancksToUnbond = nomPoolPlanksToUnbond
      break
  }

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload })

  return {
    plancksToUnbond,
    pool,
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
  }
}
