import { ChainId } from "extension-core"
import { useMemo } from "react"

import { ScaleApi } from "@ui/util/scaleApi"

import { useGetBittensorStakingPayload } from "./useGetBittensorStakingPayload"
import { useGetFeeEstimate } from "./useGetFeeEstimate"
import { useGetNomPoolStakingPayload } from "./useGetNomPoolStakingPayload"
import { useNomPoolsClaimPermission } from "./useNomPoolsClaimPermission"

type GetStakingInfo = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null
  plancks: bigint | null
  isFormValid: boolean
  chainId: ChainId | undefined
  hasJoinedNomPool: boolean
}

export const useGetStakingInfo = ({
  sapi,
  address,
  poolId,
  plancks,
  isFormValid,
  chainId,
  hasJoinedNomPool,
}: GetStakingInfo) => {
  const bittensorStakingPayload = useGetBittensorStakingPayload({
    sapi,
    address,
    poolId,
    plancks,
    isFormValid,
    isEnabled: chainId === "bittensor",
  })

  const { data: claimPermission } = useNomPoolsClaimPermission(chainId, address)

  const withSetClaimPermission = useMemo(() => {
    switch (claimPermission) {
      case "PermissionlessCompound":
      case "PermissionlessAll":
        return false
      default:
        // if the user is already staking in a pool, we shouldn't change the claim permission
        return !hasJoinedNomPool
    }
  }, [claimPermission, hasJoinedNomPool])

  const nomPoolStakingPayload = useGetNomPoolStakingPayload({
    sapi,
    address,
    poolId,
    plancks,
    isFormValid,
    hasJoinedNomPool,
    withSetClaimPermission,
  })

  let payloadAndMetadata, isLoadingPayload, errorPayload

  switch (chainId) {
    case "bittensor":
      payloadAndMetadata = bittensorStakingPayload.data
      isLoadingPayload = bittensorStakingPayload.isLoading
      errorPayload = bittensorStakingPayload.error
      break
    default:
      payloadAndMetadata = nomPoolStakingPayload.data
      isLoadingPayload = nomPoolStakingPayload.isLoading
      errorPayload = nomPoolStakingPayload.error
      break
  }

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
  }
}
