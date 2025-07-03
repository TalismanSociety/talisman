import { DotNetworkId } from "@talismn/chaindata-provider"
import { ScaleApi } from "@talismn/sapi"
import { UseQueryResult } from "@tanstack/react-query"
import { SignerPayloadJSON } from "extension-core"
import { useMemo } from "react"

import { useGetNomPoolStakingPayload } from "../hooks/nomPools/useGetNomPoolStakingPayload"
import { useIsSoloStaking } from "../hooks/nomPools/useIsSoloStaking"
import { useNomPoolByMember } from "../hooks/nomPools/useNomPoolByMember"
import { useNomPoolsClaimPermission } from "../hooks/nomPools/useNomPoolsClaimPermission"
import { useNomPoolsMinJoinBond } from "../hooks/nomPools/useNomPoolsMinJoinBond"
import { useNomPoolState } from "../hooks/nomPools/useNomPoolState"
import { useGetFeeEstimate } from "./useGetFeeEstimate"

type GetStakeInfo = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null | undefined
  plancks: bigint | null
  chainId: DotNetworkId | undefined
}

type BondType = "nomPools"

type StakeInfo = {
  payloadInfo: UseQueryResult<{
    payload: SignerPayloadJSON
    txMetadata?: Uint8Array
  } | null>
  bondType: BondType
  currentPoolId: string | number | undefined | null
}

export const useGetStakeInfo = ({ sapi, address, poolId, plancks, chainId }: GetStakeInfo) => {
  const { data: minJoinBond } = useNomPoolsMinJoinBond({ chainId })

  const { data: claimPermission } = useNomPoolsClaimPermission(chainId, address)

  // we must craft a different extrinsic if the user is already staking in a pool
  const { data: currentNomPool } = useNomPoolByMember(chainId, address)
  const hasJoinedNomPool = Boolean(currentNomPool?.pool_id)

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
    hasJoinedNomPool,
    withSetClaimPermission,
    minJoinBond,
  })

  const { data: isSoloStaking } = useIsSoloStaking(chainId, address)
  const { data: poolState } = useNomPoolState(chainId, poolId)

  const stakeInfo: StakeInfo = useMemo(() => {
    return {
      payloadInfo: nomPoolStakingPayload,
      bondType: "nomPools" as const,
      currentPoolId: currentNomPool?.pool_id,
    }
  }, [nomPoolStakingPayload, currentNomPool?.pool_id])

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = stakeInfo?.payloadInfo || {}

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
    bondType: stakeInfo?.bondType,
    currentPoolId: stakeInfo?.currentPoolId,
    hasJoinedNomPool,
    minJoinBond,
    isSoloStaking,
    poolState,
  }
}
