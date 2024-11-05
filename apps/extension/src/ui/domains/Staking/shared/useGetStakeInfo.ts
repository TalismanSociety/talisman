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
  poolId: string | number | null
  plancks: bigint | null
  chainId: ChainId | undefined
}

type BondType = "bittensor" | "nomPools"

export const useGetStakeInfo = ({ sapi, address, poolId, plancks, chainId }: GetStakeInfo) => {
  const bittensorStakingPayload = useGetBittensorStakingPayload({
    sapi,
    address,
    poolId,
    plancks,
    isEnabled: chainId === "bittensor",
  })
  const { data: currentBittensorStakeHotkeys } = useGetBittensorStakeHotkeys({ chainId, address })

  const { canStake, isLoading: isCanStakeLoading } = useCanStakeBittensor({
    sapi,
    address,
    hotkey: currentBittensorStakeHotkeys?.[0],
    chainId,
  })

  const { data: claimPermission } = useNomPoolsClaimPermission(chainId, address)

  let payloadInfo
  let bondType: BondType
  let currentPoolId: string | number | undefined = 0

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
  })

  const { data: currentNomPool } = useNomPoolByMember(chainId, address)
  const { data: isSoloStaking } = useIsSoloStaking(chainId, address)
  const { data: poolState } = useNomPoolState(chainId, poolId as unknown as number)

  switch (chainId) {
    case "bittensor":
      payloadInfo = bittensorStakingPayload
      bondType = "bittensor"
      currentPoolId = currentBittensorStakeHotkeys?.[0]
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
  const { data: minJoinBond } = useGetMinJoinBond(chainId)

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
