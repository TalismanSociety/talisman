import { DotNetworkId } from "@talismn/chaindata-provider"
import { ScaleApi } from "@talismn/sapi"

import { useGetNomPoolPlanksToUnbond } from "../hooks/nomPools/useGetNomPoolPlanksToUnbond"
import { useGetNomPoolUnbondPayload } from "../hooks/nomPools/useGetNomPoolUnbondPayload"
import { useNomPoolByMember } from "../hooks/nomPools/useNomPoolByMember"
import { useGetFeeEstimate } from "./useGetFeeEstimate"

type GetUnbondInfo = {
  sapi: ScaleApi | undefined | null
  chainId: DotNetworkId | undefined
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

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = nomPoolUnbondPayload || {}

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload })

  return {
    plancksToUnbond: nomPoolPlanksToUnbond,
    pool,
    poolId: pool?.pool_id,
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    unbondType: "nomPools",
  }
}
