import { ChainId } from "extension-core"

import { ScaleApi } from "@ui/util/scaleApi"

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
    isEnabled: true,
  })
  const nomPoolUnbondPayload = useGetNomPoolUnbondPayload({
    sapi,
    address,
    pool,
    isEnabled: chainId !== "bittensor",
  })

  let payloadAndMetadata, isLoadingPayload, errorPayload

  switch (chainId) {
    case "bittensor":
      // console.log("TODO: implement bittensor")
      break
    default:
      payloadAndMetadata = nomPoolUnbondPayload.data
      isLoadingPayload = nomPoolUnbondPayload.isLoading
      errorPayload = nomPoolUnbondPayload.error
      break
  }

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload })

  return {
    plancksToUnbond: nomPoolPlanksToUnbond,
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
