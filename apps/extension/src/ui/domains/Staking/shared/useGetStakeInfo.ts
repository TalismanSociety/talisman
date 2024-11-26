import { ChainId } from "extension-core"
import { useMemo } from "react"

import { ScaleApi } from "@ui/util/scaleApi"

import { useCanStakeBittensor } from "../hooks/bittensor/useCanStakeBittensor"
import { useGetBittensorStakeHotkeys } from "../hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetBittensorStakingPayload } from "../hooks/bittensor/useGetBittensorStakingPayload"
import { useGetNomPoolStakingPayload } from "../hooks/nomPools/useGetNomPoolStakingPayload"
import { useIsSoloStaking } from "../hooks/nomPools/useIsSoloStaking"
import { useNomPoolByMember } from "../hooks/nomPools/useNomPoolByMember"
import { useNomPoolsClaimPermission } from "../hooks/nomPools/useNomPoolsClaimPermission"
import { useNomPoolState } from "../hooks/nomPools/useNomPoolState"
import { useGetFeeEstimate } from "./useGetFeeEstimate"
import { useGetMinJoinBond } from "./useGetMinJoinBond"

type GetStakeInfo = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null | undefined
  plancks: bigint | null
  chainId: ChainId | undefined
}

type BondType = "bittensor" | "nomPools"

export const useGetStakeInfo = ({ sapi, address, poolId, plancks, chainId }: GetStakeInfo) => {
  const { data: minJoinBond } = useGetMinJoinBond(chainId)

  const bittensorStakingPayload = useGetBittensorStakingPayload({
    sapi,
    address,
    poolId,
    plancks,
    minJoinBond,
    isEnabled: chainId === "bittensor",
  })

  const { canStake, isLoading: isCanStakeLoading } = useCanStakeBittensor({
    sapi,
    address,
    hotkey: poolId,
    chainId,
  })

  const { data: hotkeys } = useGetBittensorStakeHotkeys({ address, chainId })

  const { data: claimPermission } = useNomPoolsClaimPermission(chainId, address)

  let payloadInfo
  let bondType: BondType
  let currentPoolId: string | number | undefined | null = 0

  // we must craft a different extrinsic if the user is already staking in a pool
  const hasJoinedNomPool = useMemo(() => !!currentPoolId, [currentPoolId])

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

  const { data: currentNomPool } = useNomPoolByMember(chainId, address)
  const { data: isSoloStaking } = useIsSoloStaking(chainId, address)
  const { data: poolState } = useNomPoolState(chainId, poolId)

  switch (chainId) {
    case "bittensor":
      payloadInfo = bittensorStakingPayload
      bondType = "bittensor"
      currentPoolId = hotkeys?.[0] ?? poolId
      break
    default:
      payloadInfo = nomPoolStakingPayload
      bondType = "nomPools"
      currentPoolId = currentNomPool?.pool_id
      break
  }
  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = payloadInfo || {}

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
    bondType,
    currentPoolId,
    hasJoinedNomPool,
    minJoinBond,
    isSoloStaking,
    poolState,
    canStake,
    isCanStakeLoading,
  }
}
